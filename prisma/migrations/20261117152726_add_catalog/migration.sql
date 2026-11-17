-- CreateTable
CREATE TABLE "College" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "catalogId" INTEGER
);

-- CreateTable
CREATE TABLE "Program" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "catalogId" INTEGER NOT NULL,
    "catalogYear" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "degree" TEXT NOT NULL DEFAULT '',
    "totalCredits" INTEGER,
    "catalogUrl" TEXT NOT NULL DEFAULT '',
    "collegeCode" TEXT,
    CONSTRAINT "Program_collegeCode_fkey" FOREIGN KEY ("collegeCode") REFERENCES "College" ("code") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Course" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "catalogId" INTEGER,
    "prefix" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "minCredits" REAL,
    "maxCredits" REAL,
    "creditsText" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "prerequisites" TEXT NOT NULL DEFAULT '',
    "corequisites" TEXT NOT NULL DEFAULT '',
    "restrictions" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "RequirementGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "programId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "label" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "rule" TEXT NOT NULL,
    "chooseCount" INTEGER,
    "chooseCredits" REAL,
    "minCredits" REAL,
    "maxCredits" REAL,
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "RequirementGroup_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RequirementGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequirementCourse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "groupId" INTEGER NOT NULL,
    "courseCode" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "RequirementCourse_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RequirementGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementCourse_courseCode_fkey" FOREIGN KEY ("courseCode") REFERENCES "Course" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Program_collegeCode_idx" ON "Program"("collegeCode");

-- CreateIndex
CREATE INDEX "Program_type_idx" ON "Program"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Program_catalogId_catalogYear_key" ON "Program"("catalogId", "catalogYear");

-- CreateIndex
CREATE INDEX "Course_prefix_idx" ON "Course"("prefix");

-- CreateIndex
CREATE INDEX "RequirementGroup_programId_idx" ON "RequirementGroup"("programId");

-- CreateIndex
CREATE INDEX "RequirementGroup_parentId_idx" ON "RequirementGroup"("parentId");

-- CreateIndex
CREATE INDEX "RequirementCourse_groupId_idx" ON "RequirementCourse"("groupId");

-- CreateIndex
CREATE INDEX "RequirementCourse_courseCode_idx" ON "RequirementCourse"("courseCode");
