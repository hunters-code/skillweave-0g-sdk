import { expect } from "chai";
import { ethers } from "hardhat";
import { SkillRegistry, SkillRegistry__factory } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

function computeSkillId(name: string, version: string, address: string): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "string", "address"],
      [name, version, address]
    )
  );
}

describe("SkillRegistry", function () {
  let registry: SkillRegistry;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const SKILL_NAME = "my-skill";
  const SKILL_VERSION = "1.0.0";
  const SKILL_SLUG = "my-skill";
  const SKILL_DESCRIPTION = "A test skill";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    registry = await new SkillRegistry__factory(owner).deploy(owner.address);
    await registry.waitForDeployment();
  });

  // --------------- registerSkill ---------------

  describe("registerSkill", function () {
    it("should register a skill and emit SkillRegistered", async function () {
      const expectedSkillId = computeSkillId(SKILL_NAME, SKILL_VERSION, user1.address);

      await expect(
        registry
          .connect(user1)
          .registerSkill(SKILL_NAME, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION)
      )
        .to.emit(registry, "SkillRegistered")
        .withArgs(expectedSkillId, user1.address, SKILL_NAME, SKILL_VERSION);
    });

    it("should return the correct skillId", async function () {
      const expectedSkillId = computeSkillId(SKILL_NAME, SKILL_VERSION, user1.address);
      const tx = registry
        .connect(user1)
        .registerSkill(SKILL_NAME, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION);
      // Verify via getSkill after registration
      await tx;
      const skill = await registry.getSkill(expectedSkillId);
      expect(skill.id).to.equal(expectedSkillId);
    });

    it("should revert on duplicate registration", async function () {
      await registry
        .connect(user1)
        .registerSkill(SKILL_NAME, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION);

      const expectedSkillId = computeSkillId(SKILL_NAME, SKILL_VERSION, user1.address);
      await expect(
        registry
          .connect(user1)
          .registerSkill(SKILL_NAME, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "SkillAlreadyRegistered")
        .withArgs(expectedSkillId);
    });

    it("should revert with empty name", async function () {
      await expect(
        registry.connect(user1).registerSkill("", SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "EmptyName");
    });

    it("should revert when name exceeds 64 characters", async function () {
      const longName = "a".repeat(65);
      await expect(
        registry
          .connect(user1)
          .registerSkill(longName, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "NameTooLong");
    });

    it("should accept name of exactly 64 characters", async function () {
      const maxName = "a".repeat(64);
      await expect(
        registry
          .connect(user1)
          .registerSkill(maxName, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION)
      ).to.not.be.reverted;
    });

    it("should revert with empty version", async function () {
      await expect(
        registry.connect(user1).registerSkill(SKILL_NAME, "", SKILL_SLUG, SKILL_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "EmptyVersion");
    });

    it("should revert with empty slug", async function () {
      await expect(
        registry.connect(user1).registerSkill(SKILL_NAME, SKILL_VERSION, "", SKILL_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "EmptySlug");
    });

    it("should allow two different users to register the same name and version", async function () {
      await registry
        .connect(user1)
          .registerSkill(SKILL_NAME, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION);

      // user2 registers same name+version — different owner ⟹ different skillId
      await expect(
        registry
          .connect(user2)
          .registerSkill(SKILL_NAME, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION)
      ).to.not.be.reverted;
    });
  });

  // --------------- getSkill ---------------

  describe("getSkill", function () {
    let skillId: string;

    beforeEach(async function () {
      skillId = computeSkillId(SKILL_NAME, SKILL_VERSION, user1.address);
      await registry
        .connect(user1)
        .registerSkill(SKILL_NAME, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION);
    });

    it("should return the correct skill data", async function () {
      const skill = await registry.getSkill(skillId);
      expect(skill.id).to.equal(skillId);
      expect(skill.name).to.equal(SKILL_NAME);
      expect(skill.version).to.equal(SKILL_VERSION);
      expect(skill.owner).to.equal(user1.address);
      expect(skill.slug).to.equal(SKILL_SLUG);
      expect(skill.description).to.equal(SKILL_DESCRIPTION);
      expect(skill.isActive).to.be.true;
      expect(skill.createdAt).to.be.gt(0n);
      expect(skill.updatedAt).to.equal(skill.createdAt);
    });

    it("should revert for a non-existent skillId", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      await expect(registry.getSkill(fakeId)).to.be.revertedWithCustomError(registry, "SkillNotFound");
    });
  });

  // --------------- isRegistered ---------------

  describe("isRegistered", function () {
    it("should return true for a registered skill", async function () {
      const skillId = computeSkillId(SKILL_NAME, SKILL_VERSION, user1.address);
      await registry
        .connect(user1)
        .registerSkill(SKILL_NAME, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION);
      expect(await registry.isRegistered(skillId)).to.be.true;
    });

    it("should return false for a non-existent skillId", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      expect(await registry.isRegistered(fakeId)).to.be.false;
    });
  });

  // --------------- updateSkill ---------------

  describe("updateSkill", function () {
    let skillId: string;

    beforeEach(async function () {
      skillId = computeSkillId(SKILL_NAME, SKILL_VERSION, user1.address);
      await registry
        .connect(user1)
        .registerSkill(SKILL_NAME, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION);
    });

    it("should update skill fields and emit SkillUpdated", async function () {
      const newSlug = "my-skill-v2";
      const newDescription = "Updated description";

      await expect(registry.connect(user1).updateSkill(skillId, newSlug, newDescription))
        .to.emit(registry, "SkillUpdated")
        .withArgs(skillId);

      const skill = await registry.getSkill(skillId);
      expect(skill.slug).to.equal(newSlug);
      expect(skill.description).to.equal(newDescription);
    });

    it("should update updatedAt timestamp", async function () {
      const before = (await registry.getSkill(skillId)).updatedAt;

      // Mine a new block to advance time
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine", []);

      await registry.connect(user1).updateSkill(skillId, "new-skill-slug", SKILL_DESCRIPTION);

      const after = (await registry.getSkill(skillId)).updatedAt;
      expect(after).to.be.gt(before);
    });

    it("should revert when non-owner tries to update", async function () {
      await expect(
        registry.connect(user2).updateSkill(skillId, SKILL_SLUG, SKILL_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "NotSkillOwner");
    });

    it("should revert for non-existent skill", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      await expect(
        registry.connect(user1).updateSkill(fakeId, SKILL_SLUG, SKILL_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "SkillNotFound");
    });

    it("should revert with empty slug", async function () {
      await expect(
        registry.connect(user1).updateSkill(skillId, "", SKILL_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "EmptySlug");
    });

    it("should revert when updating a deactivated skill", async function () {
      await registry.connect(user1).deactivateSkill(skillId);
      await expect(
        registry.connect(user1).updateSkill(skillId, SKILL_SLUG, SKILL_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "SkillNotActive");
    });
  });

  // --------------- deactivateSkill ---------------

  describe("deactivateSkill", function () {
    let skillId: string;

    beforeEach(async function () {
      skillId = computeSkillId(SKILL_NAME, SKILL_VERSION, user1.address);
      await registry
        .connect(user1)
        .registerSkill(SKILL_NAME, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION);
    });

    it("should set isActive to false and emit SkillDeactivated", async function () {
      await expect(registry.connect(user1).deactivateSkill(skillId))
        .to.emit(registry, "SkillDeactivated")
        .withArgs(skillId);

      const skill = await registry.getSkill(skillId);
      expect(skill.isActive).to.be.false;
    });

    it("should still be retrievable after deactivation", async function () {
      await registry.connect(user1).deactivateSkill(skillId);
      const skill = await registry.getSkill(skillId);
      expect(skill.name).to.equal(SKILL_NAME);
    });

    it("should revert when non-owner tries to deactivate", async function () {
      await expect(registry.connect(user2).deactivateSkill(skillId)).to.be.revertedWithCustomError(
        registry,
        "NotSkillOwner"
      );
    });

    it("should revert for non-existent skill", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      await expect(registry.connect(user1).deactivateSkill(fakeId)).to.be.revertedWithCustomError(
        registry,
        "SkillNotFound"
      );
    });

    it("should allow deactivating an already deactivated skill", async function () {
      await registry.connect(user1).deactivateSkill(skillId);
      // Second deactivation should succeed (idempotent — isActive was already false)
      await expect(registry.connect(user1).deactivateSkill(skillId)).to.not.be.reverted;
    });
  });

  // --------------- getSkillsByOwner ---------------

  describe("getSkillsByOwner", function () {
    it("should return an empty array for an address with no skills", async function () {
      const skills = await registry.getSkillsByOwner(user2.address);
      expect(skills).to.have.length(0);
    });

    it("should return all skillIds registered by an owner", async function () {
      const skillId1 = computeSkillId(SKILL_NAME, "1.0.0", user1.address);
      const skillId2 = computeSkillId(SKILL_NAME, "2.0.0", user1.address);

      await registry
        .connect(user1)
        .registerSkill(SKILL_NAME, "1.0.0", SKILL_SLUG, SKILL_DESCRIPTION);
      await registry
        .connect(user1)
        .registerSkill(SKILL_NAME, "2.0.0", SKILL_SLUG, SKILL_DESCRIPTION);

      const skills = await registry.getSkillsByOwner(user1.address);
      expect(skills).to.have.length(2);
      expect(skills).to.include(skillId1);
      expect(skills).to.include(skillId2);
    });

    it("should not include skills registered by another owner", async function () {
      await registry
        .connect(user1)
        .registerSkill(SKILL_NAME, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION);
      await registry
        .connect(user2)
        .registerSkill(SKILL_NAME, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION);

      const user1Skills = await registry.getSkillsByOwner(user1.address);
      const user2Skills = await registry.getSkillsByOwner(user2.address);

      expect(user1Skills).to.have.length(1);
      expect(user2Skills).to.have.length(1);
      expect(user1Skills[0]).to.not.equal(user2Skills[0]);
    });

    it("should include deactivated skills", async function () {
      const skillId = computeSkillId(SKILL_NAME, SKILL_VERSION, user1.address);
      await registry
        .connect(user1)
        .registerSkill(SKILL_NAME, SKILL_VERSION, SKILL_SLUG, SKILL_DESCRIPTION);
      await registry.connect(user1).deactivateSkill(skillId);

      const skills = await registry.getSkillsByOwner(user1.address);
      expect(skills).to.include(skillId);
    });
  });
});
