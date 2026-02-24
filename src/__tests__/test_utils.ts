import { prisma } from "@/libs/prisma";
import { app } from "@/server";

export const TEST_USER_ID = "ckv9x3y9x0001qz1abcde1234";

// Cleans the DB (Add other tables here)
export async function resetDatabase() {
  await prisma.refreshToken.deleteMany();
  await prisma.lecturer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.studyProgram.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.roleFeature.deleteMany();
  await prisma.role.deleteMany();
  await prisma.feature.deleteMany();
}

// Creates a user with defaults, allowing you to override fields
export async function createTestUser(overrides: any = {}) {
  const plainPassword = overrides.password || "password123";
  const hashedPassword = await Bun.password.hash(plainPassword);
  const {
    roleId: _overrideRoleId,
    password: _,
    loginId: overrideLoginId,
    ...restOverrides
  } = overrides;
  let roleId = overrides.roleId;

  if (!roleId) {
    const defaultRole = await prisma.role.upsert({
      where: { name: "TestUser" },
      update: {},
      create: { name: "TestUser", description: "Default role for tests" },
    });
    roleId = defaultRole.id;
  }

  const loginId =
    overrideLoginId ||
    (typeof restOverrides.email === "string"
      ? restOverrides.email.split("@")[0]
      : undefined) ||
    `user_${Math.random().toString(36).slice(2, 10)}`;

  return await prisma.user.create({
    data: {
      id: "test-user-id",
      email: "test@test.com",
      loginId,
      ...restOverrides,
      password: hashedPassword,
      roleId: roleId,
    },
  });
}

//  Creates user + Logs in + Returns Token
export async function createAuthenticatedUser(userOverrides: any = {}) {
  const user = await createTestUser(userOverrides);
  const plainPassword = userOverrides.password || "password123";

  const loginRes = await app.handle(
    new Request("http://localhost/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": randomIp(),
      },
      body: JSON.stringify({
        email: user.email,
        password: plainPassword,
      }),
    }),
  );

  const body = await loginRes.json();
  const token = body.data?.access_token;

  return {
    user,
    token,
    authHeaders: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  };
}

/**
 * Create a Feature, useful for testing permissions or listing features
 */
export async function createTestFeature(name = "TestFeature", overrides = {}) {
  return await prisma.feature.upsert({
    where: { name },
    update: {},
    create: {
      name,
      description: "A feature created for testing purposes",
      ...overrides,
    },
  });
}

/**
 * Create a Role with specific Permissions
 */
export async function createTestRoleWithPermissions(
  roleName: string = "TestUser",
  permissions: {
    featureName: string;
    action: "read" | "create" | "update" | "delete" | "print";
  }[],
) {
  const featureMap = new Map();

  for (const p of permissions) {
    if (!featureMap.has(p.featureName)) {
      const feature = await createTestFeature(p.featureName);
      featureMap.set(p.featureName, feature.id);
    }
  }

  const role = await prisma.role.upsert({
    where: { name: roleName },
    update: {},
    create: {
      name: roleName,
      description: "Role for integration testing",
    },
  });

  await prisma.roleFeature.deleteMany({
    where: { roleId: role.id },
  });

  const permissionsData = permissions.map((p) => ({
    roleId: role.id,
    featureId: featureMap.get(p.featureName),
    [`can${p.action.charAt(0).toUpperCase() + p.action.slice(1)}`]: true,
  }));

  if (permissionsData.length > 0) {
    await prisma.roleFeature.createMany({
      data: permissionsData as any,
    });
  }

  return role;
}

// Helper to generate bunch of test users (useful for query search)
export const seedTestUsers = async () => {
  const roleAdmin = await createTestRoleWithPermissions("TestAdminRole", [
    { featureName: "user_management", action: "read" },
  ]);

  const roleEmployee = await createTestRoleWithPermissions("TestEmployeeRole", [
    { featureName: "user_management", action: "read" },
  ]);

  await prisma.user.createMany({
    data: [
      {
        email: "alice@example.com",
        loginId: "alice",
        password: "hashed",
        roleId: roleAdmin.id,
        isActive: true,
      },
      {
        email: "bob@example.com",
        loginId: "bob",
        password: "hashed",
        roleId: roleEmployee.id,
        isActive: true,
      },
      {
        email: "charlie@example.com",
        loginId: "charlie",
        password: "hashed",
        roleId: roleEmployee.id,
        isActive: false,
      },
    ],
  });

  return { roleAdmin, roleEmployee };
};

// Helper to generate bunch of test features (useful for query search)
export const seedTestFeatures = async () => {
  await prisma.feature.createMany({
    data: [
      { name: "user_management" },
      { name: "faculty_management" },
      { name: "studyProgram_management" },
      { name: "lecturer_management" },
    ],
  });
};

// Helper to generate bunch of test roles (useful for query search)
export const seedTestRoles = async () => {
  await prisma.role.createMany({
    data: [
      { name: "AdminUser", description: "Admin role" },
      { name: "ManagerUser", description: "Manager role" },
      { name: "EditorUser", description: "Editor role" },
      { name: "ViewerUser", description: "Viewer role" },
      { name: "AuditorUser", description: "Auditor role" },
    ],
  });
};

export async function createLecturerTestFixture() {
  const faculty = await prisma.faculty.create({
    data: { code: "FK", name: "Fakultas Teknik" },
  });

  const program = await prisma.studyProgram.create({
    data: { facultyId: faculty.id, code: "TI", name: "Teknik Informatika" },
  });

  const role = await prisma.role.create({ data: { name: "LecturerRole" } });

  const user = await prisma.user.create({
    data: {
      loginId: "budi-testing",
      email: "budi@test.com",
      password: "hashed",
      roleId: role.id,
    },
  });

  const lecturer = await prisma.lecturer.create({
    data: {
      userId: user.id,
      nidn: "001",
      fullName: "Dr. Budi",
      gender: "MALE",
      studyProgramId: program.id,
    },
  });

  return { lecturer, program, faculty, user };
}

export async function createLecturerListTestFixtures(count: number) {
  const faculty = await prisma.faculty.create({
    data: { code: "FK", name: "Fakultas Teknik" },
  });

  const program = await prisma.studyProgram.create({
    data: { facultyId: faculty.id, code: "TI", name: "Teknik Informatika" },
  });

  const role = await prisma.role.create({ data: { name: "LecturerRole" } });

  const lecturers = [];
  for (let i = 0; i < count; i++) {
    const user = await prisma.user.create({
      data: {
        loginId: `dosen${i}`,
        email: `dosen${i}@test.com`,
        password: "hashed",
        roleId: role.id,
      },
    });

    const lecturer = await prisma.lecturer.create({
      data: {
        userId: user.id,
        nidn: `12345${i}`,
        fullName: `Budi ${i}`,
        gender: "MALE",
        studyProgramId: program.id,
      },
    });

    lecturers.push(lecturer);
  }

  return { lecturer: lecturers[0], program, faculty };
}

// Helper to generate a random IP for each test
export const randomIp = () => `10.0.0.${Math.floor(Math.random() * 254) + 1}`;
