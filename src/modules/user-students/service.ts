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
      generation: student.generation,
      gender: student.gender,
      yearOfEntry: student.yearOfEntry,
      birthYear: student.birthYear,
      address: student.address,
      statusMhs: student.statusMhs,
      kelas: student.kelas,
      jenis: student.jenis,
      cityBirth: student.cityBirth,
      phoneNumber: student.phoneNumber,
      semester: student.semester,
      studyProgram: student.studyProgram,
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
        generation: student.generation,
        gender: student.gender,
        yearOfEntry: student.yearOfEntry,
        birthYear: student.birthYear,
        address: student.address,
        statusMhs: student.statusMhs,
        kelas: student.kelas,
        jenis: student.jenis,
        cityBirth: student.cityBirth,
        phoneNumber: student.phoneNumber,
        semester: student.semester,
        studyProgram: student.studyProgram,
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
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { loginId: data.loginId },
            ...(data.email ? [{ email: data.email }] : []),
          ],
        },
      });

      if (existingUser) {
        if (existingUser.loginId === data.loginId) {
          log.warn({ loginId: data.loginId }, "Login ID already exists");
          throw new LoginIdExistsError();
        }
        if (data.email && existingUser.email === data.email) {
          log.warn({ email: data.email }, "Email already exists");
          throw new EmailExistsError();
        }
      }

      const existingStudent = await prisma.student.findFirst({
        where: { user: { loginId: data.loginId } },
      });

      if (existingStudent) {
        log.warn({ loginId: data.loginId }, "Student already exists");
        throw new StudentAlreadyExistsError();
      }

      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            loginId: data.loginId,
            email: data.email,
            password: data.password,
            roleId: data.roleId,
          },
        });

        const student = await tx.student.create({
          data: {
            userId: user.id,
            name: data.name,
            generation: data.generation,
            gender: data.gender,
            yearOfEntry: data.yearOfEntry,
            birthYear: data.birthYear,
            address: data.address,
            statusMhs: data.statusMhs ?? "belum_program",
            kelas: data.kelas,
            jenis: data.jenis ?? "reguler",
            cityBirth: data.cityBirth,
            phoneNumber: data.phoneNumber,
            semester: data.semester ?? 1,
            studyProgramId: data.studyProgramId,
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
        generation: created.generation,
        gender: created.gender,
        yearOfEntry: created.yearOfEntry,
        birthYear: created.birthYear,
        address: created.address,
        statusMhs: created.statusMhs,
        kelas: created.kelas,
        jenis: created.jenis,
        cityBirth: created.cityBirth,
        phoneNumber: created.phoneNumber,
        semester: created.semester,
        studyProgram: created.studyProgram,
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
        },
      });

      if (!existingStudent) {
        log.warn({ userStudentId: id }, "Student not found");
        throw new StudentNotFoundError();
      }

      const updateData: Record<string, unknown> = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.generation !== undefined)
        updateData.generation = data.generation;
      if (data.gender !== undefined) updateData.gender = data.gender;
      if (data.yearOfEntry !== undefined)
        updateData.yearOfEntry = data.yearOfEntry;
      if (data.birthYear !== undefined) updateData.birthYear = data.birthYear;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.statusMhs !== undefined) updateData.statusMhs = data.statusMhs;
      if (data.kelas !== undefined) updateData.kelas = data.kelas;
      if (data.jenis !== undefined) updateData.jenis = data.jenis;
      if (data.cityBirth !== undefined) updateData.cityBirth = data.cityBirth;
      if (data.phoneNumber !== undefined)
        updateData.phoneNumber = data.phoneNumber;
      if (data.semester !== undefined) updateData.semester = data.semester;
      if (data.studyProgramId !== undefined) {
        updateData.studyProgramId = data.studyProgramId;
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
        generation: updated.generation,
        gender: updated.gender,
        yearOfEntry: updated.yearOfEntry,
        birthYear: updated.birthYear,
        address: updated.address,
        statusMhs: updated.statusMhs,
        kelas: updated.kelas,
        jenis: updated.jenis,
        cityBirth: updated.cityBirth,
        phoneNumber: updated.phoneNumber,
        semester: updated.semester,
        studyProgram: updated.studyProgram,
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
