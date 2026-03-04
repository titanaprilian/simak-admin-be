import { prisma } from "@/libs/prisma";
import type {
  StudentQuery,
  CreateUserStudentInput,
  UpdateUserStudentInput,
} from "./schema";
import type { Logger } from "pino";
import {
  LoginIdExistsError,
  EmailExistsError,
  StudentAlreadyExistsError,
  StudentNotFoundError,
  DeleteSelfStudentError,
  MahasiswaRoleNotFoundError,
} from "./error";
import { handlePrismaError } from "@/libs/exceptions";

export const StudentService = {
  getAll: async (params: StudentQuery, log: Logger) => {
    log.debug(
      {
        page: params.page,
        limit: params.limit,
        search: params.search,
        studyProgramId: params.studyProgramId,
      },
      "Fetching students list",
    );

    const { page = 1, limit = 10, search, studyProgramId } = params;
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { user: { loginId: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (studyProgramId) {
      where.studyProgramId = studyProgramId;
    }

    const skip = (page - 1) * limit;

    const [students, total] = await prisma.$transaction([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          user: {
            select: {
              id: true,
              loginId: true,
              email: true,
              isActive: true,
            },
          },
          studyProgram: {
            select: {
              id: true,
              name: true,
            },
          },
          academicClass: {
            select: {
              id: true,
              name: true,
            },
          },
          enrollmentTerm: {
            select: {
              id: true,
              academicYear: true,
              termType: true,
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    log.info(
      { count: students.length, total },
      "Students retrieved successfully",
    );

    const formattedStudents = students.map((student) => ({
      id: student.id,
      nim: student.user.loginId,
      email: student.user.email,
      isActive: student.user.isActive,
      name: student.name,
      gender: student.gender,
      birthYear: student.birthYear,
      address: student.address,
      jenis: student.jenis,
      cityBirth: student.cityBirth,
      phoneNumber: student.phoneNumber,
      studyProgram: student.studyProgram,
      academicClass: student.academicClass,
      enrollmentTerm: student.enrollmentTerm,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
    }));

    return {
      students: formattedStudents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  getUserStudentById: async (id: string, log: Logger) => {
    log.debug({ userStudentId: id }, "Fetching user student details");

    try {
      const student = await prisma.student.findUniqueOrThrow({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              loginId: true,
              email: true,
              isActive: true,
            },
          },
          studyProgram: {
            select: {
              id: true,
              name: true,
            },
          },
          academicClass: {
            select: {
              id: true,
              name: true,
            },
          },
          enrollmentTerm: {
            select: {
              id: true,
              academicYear: true,
              termType: true,
            },
          },
        },
      });

      log.info(
        {
          userStudentId: id,
          nim: student.user.loginId,
          name: student.name,
        },
        "User student retrieved successfully",
      );

      return {
        id: student.id,
        nim: student.user.loginId,
        email: student.user.email,
        isActive: student.user.isActive,
        name: student.name,
        gender: student.gender,
        birthYear: student.birthYear,
        address: student.address,
        jenis: student.jenis,
        cityBirth: student.cityBirth,
        phoneNumber: student.phoneNumber,
        studyProgram: student.studyProgram,
        academicClass: student.academicClass,
        enrollmentTerm: student.enrollmentTerm,
        createdAt: student.createdAt.toISOString(),
        updatedAt: student.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  createUserStudent: async (data: CreateUserStudentInput, log: Logger) => {
    log.debug(
      { loginId: data.loginId, email: data.email, name: data.name },
      "Creating new user student",
    );

    try {
      let loginId = data.loginId;

      if (loginId) {
        const existingUser = await prisma.user.findUnique({
          where: { loginId },
        });

        if (existingUser) {
          log.warn({ loginId }, "Login ID already exists");
          throw new LoginIdExistsError(loginId);
        }
      } else {
        loginId = await generateLoginId(
          data.studyProgramId,
          data.enrollmentTermId,
          log,
        );
        log.debug({ loginId }, "Auto-generated loginId");
      }

      if (data.email) {
        const existingUserWithEmail = await prisma.user.findFirst({
          where: { email: data.email },
        });

        if (existingUserWithEmail) {
          log.warn({ email: data.email }, "Email already exists");
          throw new EmailExistsError();
        }
      }

      const existingStudent = await prisma.student.findFirst({
        where: { user: { loginId } },
      });

      if (existingStudent) {
        log.warn({ loginId }, "Student already exists");
        throw new StudentAlreadyExistsError();
      }

      let roleId = data.roleId;
      if (!roleId) {
        const mahasiswaRole = await prisma.role.findUnique({
          where: { name: "Mahasiswa" },
        });

        if (!mahasiswaRole) {
          log.warn({}, "Mahasiswa role not found");
          throw new MahasiswaRoleNotFoundError();
        }

        roleId = mahasiswaRole.id;
        log.debug({ roleId: mahasiswaRole.id }, "Auto-assigned Mahasiswa role");
      }

      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            loginId: loginId,
            email: data.email,
            password: data.password,
            roleId: roleId,
          },
        });

        const student = await tx.student.create({
          data: {
            userId: user.id,
            name: data.name,
            gender: data.gender,
            birthYear: data.birthYear,
            address: data.address,
            jenis: data.jenis ?? "reguler",
            cityBirth: data.cityBirth,
            phoneNumber: data.phoneNumber,
            studyProgramId: data.studyProgramId,
            academicClassId: data.academicClassId,
            enrollmentTermId: data.enrollmentTermId,
          },
          include: {
            user: {
              select: {
                id: true,
                loginId: true,
                email: true,
                isActive: true,
              },
            },
            studyProgram: {
              select: {
                id: true,
                name: true,
              },
            },
            academicClass: {
              select: {
                id: true,
                name: true,
              },
            },
            enrollmentTerm: {
              select: {
                id: true,
                academicYear: true,
                termType: true,
              },
            },
          },
        });

        return student;
      });

      log.info(
        { userStudentId: created.id },
        "User student created successfully",
      );

      return {
        id: created.id,
        nim: created.user.loginId,
        email: created.user.email,
        isActive: created.user.isActive,
        name: created.name,
        gender: created.gender,
        birthYear: created.birthYear,
        address: created.address,
        jenis: created.jenis,
        cityBirth: created.cityBirth,
        phoneNumber: created.phoneNumber,
        studyProgram: created.studyProgram,
        academicClass: created.academicClass,
        enrollmentTerm: created.enrollmentTerm,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  updateUserStudent: async (
    id: string,
    data: UpdateUserStudentInput,
    log: Logger,
  ) => {
    log.debug({ userStudentId: id }, "Updating user student");

    try {
      const existingStudent = await prisma.student.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              loginId: true,
              email: true,
              isActive: true,
            },
          },
          studyProgram: {
            select: {
              id: true,
              name: true,
            },
          },
          academicClass: {
            select: {
              id: true,
              name: true,
            },
          },
          enrollmentTerm: {
            select: {
              id: true,
              academicYear: true,
              termType: true,
            },
          },
        },
      });

      if (!existingStudent) {
        log.warn({ userStudentId: id }, "Student not found");
        throw new StudentNotFoundError();
      }

      const updateData: Record<string, unknown> = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.gender !== undefined) updateData.gender = data.gender;
      if (data.birthYear !== undefined) updateData.birthYear = data.birthYear;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.jenis !== undefined) updateData.jenis = data.jenis;
      if (data.cityBirth !== undefined) updateData.cityBirth = data.cityBirth;
      if (data.phoneNumber !== undefined)
        updateData.phoneNumber = data.phoneNumber;
      if (data.studyProgramId !== undefined) {
        updateData.studyProgramId = data.studyProgramId;
      }
      if (data.academicClassId !== undefined) {
        updateData.academicClassId = data.academicClassId;
      }
      if (data.enrollmentTermId !== undefined) {
        updateData.enrollmentTermId = data.enrollmentTermId;
      }

      const userUpdateData: Record<string, unknown> = {};
      if (data.email !== undefined) userUpdateData.email = data.email;
      if (data.isActive !== undefined) userUpdateData.isActive = data.isActive;

      const updated = await prisma.$transaction(async (tx) => {
        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { id: existingStudent.userId },
            data: userUpdateData,
          });
        }

        return tx.student.update({
          where: { id },
          data: updateData,
          include: {
            user: {
              select: {
                id: true,
                loginId: true,
                email: true,
                isActive: true,
              },
            },
            studyProgram: {
              select: {
                id: true,
                name: true,
              },
            },
            academicClass: {
              select: {
                id: true,
                name: true,
              },
            },
            enrollmentTerm: {
              select: {
                id: true,
                academicYear: true,
                termType: true,
              },
            },
          },
        });
      });

      log.info({ userStudentId: id }, "User student updated successfully");

      return {
        id: updated.id,
        nim: updated.user.loginId,
        email: updated.user.email,
        isActive: updated.user.isActive,
        name: updated.name,
        gender: updated.gender,
        birthYear: updated.birthYear,
        address: updated.address,
        jenis: updated.jenis,
        cityBirth: updated.cityBirth,
        phoneNumber: updated.phoneNumber,
        studyProgram: updated.studyProgram,
        academicClass: updated.academicClass,
        enrollmentTerm: updated.enrollmentTerm,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error, log);
    }
  },

  deleteUserStudent: async (id: string, currentUserId: string, log: Logger) => {
    log.debug({ userStudentId: id, currentUserId }, "Deleting user student");

    try {
      const existingStudent = await prisma.student.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!existingStudent) {
        log.warn({ userStudentId: id }, "Student not found");
        throw new StudentNotFoundError();
      }

      if (existingStudent.userId === currentUserId) {
        log.warn({ userStudentId: id, currentUserId }, "Self-deletion attempt");
        throw new DeleteSelfStudentError();
      }

      await prisma.$transaction(async (tx) => {
        await tx.student.delete({
          where: { id },
        });

        await tx.user.delete({
          where: { id: existingStudent.userId },
        });
      });

      log.info({ userStudentId: id }, "User student deleted successfully");
    } catch (error) {
      handlePrismaError(error, log);
    }
  },
};

async function generateLoginId(
  studyProgramId: string,
  enrollmentTermId: string,
  log: Logger,
): Promise<string> {
  const studyProgram = await prisma.studyProgram.findUnique({
    where: { id: studyProgramId },
    include: { faculty: true },
  });

  if (!studyProgram) {
    throw new Error("Study program not found");
  }

  const academicTerm = await prisma.academicTerm.findUnique({
    where: { id: enrollmentTermId },
  });

  if (!academicTerm) {
    throw new Error("Academic term not found");
  }

  const firstYear = academicTerm.academicYear.split("/")[0];
  const yearPrefix = firstYear.slice(-2);
  const facultyCode = studyProgram.faculty.code;
  const programCode = studyProgram.code;

  const existingStudents = await prisma.student.findMany({
    where: { studyProgramId },
    orderBy: { createdAt: "desc" },
    take: 1,
    include: {
      user: {
        select: { loginId: true },
      },
    },
  });

  let uniqueNumber: number;

  if (existingStudents.length > 0) {
    const lastLoginId = existingStudents[0].user.loginId;
    const lastUniqueNumber = parseInt(lastLoginId.slice(-4), 10);
    uniqueNumber = lastUniqueNumber + 1;
  } else {
    uniqueNumber = 1;
  }

  if (uniqueNumber > 9999) {
    throw new Error("Cannot generate more student IDs for this study program");
  }

  const loginId = `${yearPrefix}${facultyCode}${programCode}${uniqueNumber.toString().padStart(4, "0")}`;

  const existingUser = await prisma.user.findUnique({
    where: { loginId },
  });

  if (existingUser) {
    log.warn({ loginId }, "Generated loginId already exists, retrying");
    uniqueNumber = Math.floor(Math.random() * 9000) + 1000;
    return `${yearPrefix}${facultyCode}${programCode}${uniqueNumber.toString().padStart(4, "0")}`;
  }

  return loginId;
}
