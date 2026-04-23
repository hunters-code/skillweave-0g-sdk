// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PluginRegistry is Ownable, ReentrancyGuard {
    struct Plugin {
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

    mapping(bytes32 => Plugin) private _plugins;
    mapping(address => bytes32[]) private _ownerPlugins;

    event PluginRegistered(
        bytes32 indexed pluginId,
        address indexed owner,
        string name,
        string version
    );
    event PluginUpdated(bytes32 indexed pluginId);
    event PluginDeactivated(bytes32 indexed pluginId);

    error EmptyName();
    error NameTooLong();
    error EmptyVersion();
    error EmptySlug();
    error PluginAlreadyRegistered(bytes32 pluginId);
    error PluginNotFound(bytes32 pluginId);
    error NotPluginOwner();
    error PluginNotActive();

    constructor(address initialOwner) Ownable(initialOwner) {}

    function registerPlugin(
        string calldata name,
        string calldata version,
        string calldata slug,
        string calldata description
    ) external nonReentrant returns (bytes32 pluginId) {
        if (bytes(name).length == 0) revert EmptyName();
        if (bytes(name).length > MAX_NAME_LENGTH) revert NameTooLong();
        if (bytes(version).length == 0) revert EmptyVersion();
        if (bytes(slug).length == 0) revert EmptySlug();

        pluginId = keccak256(abi.encode(name, version, msg.sender));

        if (_plugins[pluginId].createdAt != 0) revert PluginAlreadyRegistered(pluginId);

        _plugins[pluginId] = Plugin({
            id: pluginId,
            name: name,
            version: version,
            owner: msg.sender,
            slug: slug,
            description: description,
            isActive: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _ownerPlugins[msg.sender].push(pluginId);

        emit PluginRegistered(pluginId, msg.sender, name, version);
    }

    function updatePlugin(
        bytes32 pluginId,
        string calldata slug,
        string calldata description
    ) external {
        Plugin storage plugin = _plugins[pluginId];
        if (plugin.createdAt == 0) revert PluginNotFound(pluginId);
        if (plugin.owner != msg.sender) revert NotPluginOwner();
        if (!plugin.isActive) revert PluginNotActive();
        if (bytes(slug).length == 0) revert EmptySlug();

        plugin.slug = slug;
        plugin.description = description;
        plugin.updatedAt = block.timestamp;

        emit PluginUpdated(pluginId);
    }

    function deactivatePlugin(bytes32 pluginId) external {
        Plugin storage plugin = _plugins[pluginId];
        if (plugin.createdAt == 0) revert PluginNotFound(pluginId);
        if (plugin.owner != msg.sender) revert NotPluginOwner();

        plugin.isActive = false;
        plugin.updatedAt = block.timestamp;

        emit PluginDeactivated(pluginId);
    }

    function getPlugin(bytes32 pluginId) external view returns (Plugin memory) {
        if (_plugins[pluginId].createdAt == 0) revert PluginNotFound(pluginId);
        return _plugins[pluginId];
    }

    function isRegistered(bytes32 pluginId) external view returns (bool) {
        return _plugins[pluginId].createdAt != 0;
    }

    function getPluginsByOwner(address owner) external view returns (bytes32[] memory) {
        return _ownerPlugins[owner];
    }
}
