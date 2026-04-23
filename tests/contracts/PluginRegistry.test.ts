import { expect } from "chai";
import { ethers } from "hardhat";
import { PluginRegistry, PluginRegistry__factory } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

function computePluginId(name: string, version: string, address: string): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "string", "address"],
      [name, version, address]
    )
  );
}

describe("PluginRegistry", function () {
  let registry: PluginRegistry;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const PLUGIN_NAME = "my-plugin";
  const PLUGIN_VERSION = "1.0.0";
  const PLUGIN_SLUG = "my-plugin";
  const PLUGIN_DESCRIPTION = "A test plugin";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    registry = await new PluginRegistry__factory(owner).deploy(owner.address);
    await registry.waitForDeployment();
  });

  describe("registerPlugin", function () {
    it("should register a plugin and emit PluginRegistered", async function () {
      const expectedPluginId = computePluginId(PLUGIN_NAME, PLUGIN_VERSION, user1.address);

      await expect(
        registry
          .connect(user1)
          .registerPlugin(PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION)
      )
        .to.emit(registry, "PluginRegistered")
        .withArgs(expectedPluginId, user1.address, PLUGIN_NAME, PLUGIN_VERSION);
    });

    it("should return the correct pluginId", async function () {
      const expectedPluginId = computePluginId(PLUGIN_NAME, PLUGIN_VERSION, user1.address);
      const tx = registry
        .connect(user1)
        .registerPlugin(PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION);
      await tx;
      const plugin = await registry.getPlugin(expectedPluginId);
      expect(plugin.id).to.equal(expectedPluginId);
    });

    it("should revert on duplicate registration", async function () {
      await registry
        .connect(user1)
        .registerPlugin(PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION);

      const expectedPluginId = computePluginId(PLUGIN_NAME, PLUGIN_VERSION, user1.address);
      await expect(
        registry
          .connect(user1)
          .registerPlugin(PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "PluginAlreadyRegistered")
        .withArgs(expectedPluginId);
    });

    it("should revert with empty name", async function () {
      await expect(
        registry.connect(user1).registerPlugin("", PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "EmptyName");
    });

    it("should revert when name exceeds 64 characters", async function () {
      const longName = "a".repeat(65);
      await expect(
        registry
          .connect(user1)
          .registerPlugin(longName, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "NameTooLong");
    });

    it("should accept name of exactly 64 characters", async function () {
      const maxName = "a".repeat(64);
      await expect(
        registry
          .connect(user1)
          .registerPlugin(maxName, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION)
      ).to.not.be.reverted;
    });

    it("should revert with empty version", async function () {
      await expect(
        registry.connect(user1).registerPlugin(PLUGIN_NAME, "", PLUGIN_SLUG, PLUGIN_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "EmptyVersion");
    });

    it("should revert with empty slug", async function () {
      await expect(
        registry.connect(user1).registerPlugin(PLUGIN_NAME, PLUGIN_VERSION, "", PLUGIN_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "EmptySlug");
    });

    it("should allow two different users to register the same name and version", async function () {
      await registry
        .connect(user1)
        .registerPlugin(PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION);

      await expect(
        registry
          .connect(user2)
          .registerPlugin(PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION)
      ).to.not.be.reverted;
    });
  });

  describe("getPlugin", function () {
    let pluginId: string;

    beforeEach(async function () {
      pluginId = computePluginId(PLUGIN_NAME, PLUGIN_VERSION, user1.address);
      await registry
        .connect(user1)
        .registerPlugin(PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION);
    });

    it("should return the correct plugin data", async function () {
      const plugin = await registry.getPlugin(pluginId);
      expect(plugin.id).to.equal(pluginId);
      expect(plugin.name).to.equal(PLUGIN_NAME);
      expect(plugin.version).to.equal(PLUGIN_VERSION);
      expect(plugin.owner).to.equal(user1.address);
      expect(plugin.slug).to.equal(PLUGIN_SLUG);
      expect(plugin.description).to.equal(PLUGIN_DESCRIPTION);
      expect(plugin.isActive).to.be.true;
      expect(plugin.createdAt).to.be.gt(0n);
      expect(plugin.updatedAt).to.equal(plugin.createdAt);
    });

    it("should revert for a non-existent pluginId", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      await expect(registry.getPlugin(fakeId)).to.be.revertedWithCustomError(registry, "PluginNotFound");
    });
  });

  describe("isRegistered", function () {
    it("should return true for a registered plugin", async function () {
      const pluginId = computePluginId(PLUGIN_NAME, PLUGIN_VERSION, user1.address);
      await registry
        .connect(user1)
        .registerPlugin(PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION);
      expect(await registry.isRegistered(pluginId)).to.be.true;
    });

    it("should return false for a non-existent pluginId", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      expect(await registry.isRegistered(fakeId)).to.be.false;
    });
  });

  describe("updatePlugin", function () {
    let pluginId: string;

    beforeEach(async function () {
      pluginId = computePluginId(PLUGIN_NAME, PLUGIN_VERSION, user1.address);
      await registry
        .connect(user1)
        .registerPlugin(PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION);
    });

    it("should update plugin fields and emit PluginUpdated", async function () {
      const newSlug = "my-plugin-v2";
      const newDescription = "Updated description";

      await expect(registry.connect(user1).updatePlugin(pluginId, newSlug, newDescription))
        .to.emit(registry, "PluginUpdated")
        .withArgs(pluginId);

      const plugin = await registry.getPlugin(pluginId);
      expect(plugin.slug).to.equal(newSlug);
      expect(plugin.description).to.equal(newDescription);
    });

    it("should update updatedAt timestamp", async function () {
      const before = (await registry.getPlugin(pluginId)).updatedAt;
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine", []);
      await registry.connect(user1).updatePlugin(pluginId, "new-plugin-slug", PLUGIN_DESCRIPTION);
      const after = (await registry.getPlugin(pluginId)).updatedAt;
      expect(after).to.be.gt(before);
    });

    it("should revert when non-owner tries to update", async function () {
      await expect(
        registry.connect(user2).updatePlugin(pluginId, PLUGIN_SLUG, PLUGIN_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "NotPluginOwner");
    });

    it("should revert for non-existent plugin", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      await expect(
        registry.connect(user1).updatePlugin(fakeId, PLUGIN_SLUG, PLUGIN_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "PluginNotFound");
    });

    it("should revert with empty slug", async function () {
      await expect(
        registry.connect(user1).updatePlugin(pluginId, "", PLUGIN_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "EmptySlug");
    });

    it("should revert when updating a deactivated plugin", async function () {
      await registry.connect(user1).deactivatePlugin(pluginId);
      await expect(
        registry.connect(user1).updatePlugin(pluginId, PLUGIN_SLUG, PLUGIN_DESCRIPTION)
      ).to.be.revertedWithCustomError(registry, "PluginNotActive");
    });
  });

  describe("deactivatePlugin", function () {
    let pluginId: string;

    beforeEach(async function () {
      pluginId = computePluginId(PLUGIN_NAME, PLUGIN_VERSION, user1.address);
      await registry
        .connect(user1)
        .registerPlugin(PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION);
    });

    it("should set isActive to false and emit PluginDeactivated", async function () {
      await expect(registry.connect(user1).deactivatePlugin(pluginId))
        .to.emit(registry, "PluginDeactivated")
        .withArgs(pluginId);

      const plugin = await registry.getPlugin(pluginId);
      expect(plugin.isActive).to.be.false;
    });

    it("should still be retrievable after deactivation", async function () {
      await registry.connect(user1).deactivatePlugin(pluginId);
      const plugin = await registry.getPlugin(pluginId);
      expect(plugin.name).to.equal(PLUGIN_NAME);
    });

    it("should revert when non-owner tries to deactivate", async function () {
      await expect(registry.connect(user2).deactivatePlugin(pluginId)).to.be.revertedWithCustomError(
        registry,
        "NotPluginOwner"
      );
    });

    it("should revert for non-existent plugin", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      await expect(registry.connect(user1).deactivatePlugin(fakeId)).to.be.revertedWithCustomError(
        registry,
        "PluginNotFound"
      );
    });

    it("should allow deactivating an already deactivated plugin", async function () {
      await registry.connect(user1).deactivatePlugin(pluginId);
      await expect(registry.connect(user1).deactivatePlugin(pluginId)).to.not.be.reverted;
    });
  });

  describe("getPluginsByOwner", function () {
    it("should return an empty array for an address with no plugins", async function () {
      const plugins = await registry.getPluginsByOwner(user2.address);
      expect(plugins).to.have.length(0);
    });

    it("should return all pluginIds registered by an owner", async function () {
      const pluginId1 = computePluginId(PLUGIN_NAME, "1.0.0", user1.address);
      const pluginId2 = computePluginId(PLUGIN_NAME, "2.0.0", user1.address);

      await registry
        .connect(user1)
        .registerPlugin(PLUGIN_NAME, "1.0.0", PLUGIN_SLUG, PLUGIN_DESCRIPTION);
      await registry
        .connect(user1)
        .registerPlugin(PLUGIN_NAME, "2.0.0", PLUGIN_SLUG, PLUGIN_DESCRIPTION);

      const plugins = await registry.getPluginsByOwner(user1.address);
      expect(plugins).to.have.length(2);
      expect(plugins).to.include(pluginId1);
      expect(plugins).to.include(pluginId2);
    });

    it("should not include plugins registered by another owner", async function () {
      await registry
        .connect(user1)
        .registerPlugin(PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION);
      await registry
        .connect(user2)
        .registerPlugin(PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION);

      const user1Plugins = await registry.getPluginsByOwner(user1.address);
      const user2Plugins = await registry.getPluginsByOwner(user2.address);

      expect(user1Plugins).to.have.length(1);
      expect(user2Plugins).to.have.length(1);
      expect(user1Plugins[0]).to.not.equal(user2Plugins[0]);
    });

    it("should include deactivated plugins", async function () {
      const pluginId = computePluginId(PLUGIN_NAME, PLUGIN_VERSION, user1.address);
      await registry
        .connect(user1)
        .registerPlugin(PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_SLUG, PLUGIN_DESCRIPTION);
      await registry.connect(user1).deactivatePlugin(pluginId);

      const plugins = await registry.getPluginsByOwner(user1.address);
      expect(plugins).to.include(pluginId);
    });
  });
});
