// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SkillRegistry
 * @notice On-chain registry for AI skills in the SkillWeave ecosystem.
 *         Each skill is uniquely identified by keccak256(name, version, owner).
 */
contract SkillRegistry is Ownable, ReentrancyGuard {
    struct Skill {
        bytes32 id;
        string name;
        string version;
        address owner;
        string slug;
        string description;
        bool isActive;
        uint256 createdAt;
        uint256 updatedAt;
    }

    uint256 public constant MAX_NAME_LENGTH = 64;

    /// @dev skillId => Skill
    mapping(bytes32 => Skill) private _skills;

    /// @dev owner address => list of skillIds
    mapping(address => bytes32[]) private _ownerSkills;

    // --------------- Events ---------------

    event SkillRegistered(
        bytes32 indexed skillId,
        address indexed owner,
        string name,
        string version
    );
    event SkillUpdated(bytes32 indexed skillId);
    event SkillDeactivated(bytes32 indexed skillId);

    // --------------- Errors ---------------

    error EmptyName();
    error NameTooLong();
    error EmptyVersion();
    error EmptySlug();
    error SkillAlreadyRegistered(bytes32 skillId);
    error SkillNotFound(bytes32 skillId);
    error NotSkillOwner();
    error SkillNotActive();

    // --------------- Constructor ---------------

    constructor(address initialOwner) Ownable(initialOwner) {}

    // --------------- External functions ---------------

    /**
     * @notice Register a new skill.
     * @param name        Human-readable skill name (max 64 bytes).
     * @param version     Semantic version string (e.g. "1.0.0").
     * @param slug        Clawhub skill slug (e.g. "my-skill-name").
     * @param description Short description of the skill.
     * @return skillId    keccak256(name, version, msg.sender)
     */
    function registerSkill(
        string calldata name,
        string calldata version,
        string calldata slug,
        string calldata description
    ) external nonReentrant returns (bytes32 skillId) {
        if (bytes(name).length == 0) revert EmptyName();
        if (bytes(name).length > MAX_NAME_LENGTH) revert NameTooLong();
        if (bytes(version).length == 0) revert EmptyVersion();
        if (bytes(slug).length == 0) revert EmptySlug();

        skillId = keccak256(abi.encode(name, version, msg.sender));

        if (_skills[skillId].createdAt != 0) revert SkillAlreadyRegistered(skillId);

        _skills[skillId] = Skill({
            id: skillId,
            name: name,
            version: version,
            owner: msg.sender,
            slug: slug,
            description: description,
            isActive: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _ownerSkills[msg.sender].push(skillId);

        emit SkillRegistered(skillId, msg.sender, name, version);
    }

    /**
     * @notice Update a skill's mutable fields. Only the skill owner may call this.
     *         The skill must be active.
     */
    function updateSkill(
        bytes32 skillId,
        string calldata slug,
        string calldata description
    ) external {
        Skill storage skill = _skills[skillId];
        if (skill.createdAt == 0) revert SkillNotFound(skillId);
        if (skill.owner != msg.sender) revert NotSkillOwner();
        if (!skill.isActive) revert SkillNotActive();
        if (bytes(slug).length == 0) revert EmptySlug();

        skill.slug = slug;
        skill.description = description;
        skill.updatedAt = block.timestamp;

        emit SkillUpdated(skillId);
    }

    /**
     * @notice Permanently deactivate a skill. Only the skill owner may call this.
     *         Deactivated skills cannot be updated but can still be queried.
     */
    function deactivateSkill(bytes32 skillId) external {
        Skill storage skill = _skills[skillId];
        if (skill.createdAt == 0) revert SkillNotFound(skillId);
        if (skill.owner != msg.sender) revert NotSkillOwner();

        skill.isActive = false;
        skill.updatedAt = block.timestamp;

        emit SkillDeactivated(skillId);
    }

    // --------------- View functions ---------------

    /**
     * @notice Retrieve the full Skill struct by skillId.
     */
    function getSkill(bytes32 skillId) external view returns (Skill memory) {
        if (_skills[skillId].createdAt == 0) revert SkillNotFound(skillId);
        return _skills[skillId];
    }

    /**
     * @notice Returns true if a skill with the given id has been registered.
     */
    function isRegistered(bytes32 skillId) external view returns (bool) {
        return _skills[skillId].createdAt != 0;
    }

    /**
     * @notice Returns the list of skillIds registered by a given owner address.
     */
    function getSkillsByOwner(address owner) external view returns (bytes32[] memory) {
        return _ownerSkills[owner];
    }
}
