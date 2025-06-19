/**
 * Group Manager for Pagination Component
 * Manages synchronized groups of pagination instances with master-slave pattern
 */

import { EventEmitter } from './event-emitter.js';
import { ROLES, EVENTS } from '../utils/constants.js';

/**
 * Manages groups of synchronized pagination instances
 */
export class GroupManager {
    constructor() {
        this.groups = new Map();
        this.globalEmitter = new EventEmitter();
    }

    /**
     * Creates or joins a pagination group
     * @param {string} groupId - Group identifier
     * @param {Object} instance - Pagination instance
     * @param {string} role - Instance role (master/slave)
     * @returns {Object} Group information
     */
    joinGroup(groupId, instance, role = ROLES.SLAVE) {
        if (!this.groups.has(groupId)) {
            this.groups.set(groupId, {
                id: groupId,
                master: null,
                slaves: new Set(),
                emitter: new EventEmitter(),
                state: {
                    currentPage: 1,
                    pageSize: 20,
                    totalItems: 0
                }
            });
        }

        const group = this.groups.get(groupId);

        // Assign role
        if (role === ROLES.MASTER) {
            // If there's already a master, demote it to slave
            if (group.master) {
                group.slaves.add(group.master);
            }
            group.master = instance;
        } else {
            group.slaves.add(instance);
        }

        // Set up event listeners for this instance
        this._setupInstanceListeners(group, instance, role);

        return {
            group,
            role: role === ROLES.MASTER ? ROLES.MASTER : ROLES.SLAVE,
            isMaster: role === ROLES.MASTER
        };
    }

    /**
     * Leaves a pagination group
     * @param {string} groupId - Group identifier
     * @param {Object} instance - Pagination instance
     */
    leaveGroup(groupId, instance) {
        const group = this.groups.get(groupId);
        if (!group) return;

        // Remove from master or slaves
        if (group.master === instance) {
            group.master = null;
            // Promote first slave to master if any slaves exist
            if (group.slaves.size > 0) {
                const newMaster = group.slaves.values().next().value;
                group.slaves.delete(newMaster);
                group.master = newMaster;
                this._setupInstanceListeners(group, newMaster, ROLES.MASTER);
            }
        } else {
            group.slaves.delete(instance);
        }

        // Clean up empty groups
        if (!group.master && group.slaves.size === 0) {
            group.emitter.removeAllListeners();
            this.groups.delete(groupId);
        }
    }

    /**
     * Updates group state (called by master)
     * @param {string} groupId - Group identifier
     * @param {Object} newState - New state object
     * @param {Object} sourceInstance - Instance that triggered the update
     */
    updateGroupState(groupId, newState, sourceInstance) {
        const group = this.groups.get(groupId);
        if (!group || group.master !== sourceInstance) return;

        // Update group state
        Object.assign(group.state, newState);

        // Emit state change to all slaves
        group.emitter.emit(EVENTS.STATE_CHANGED, {
            ...group.state,
            sourceInstance
        });

        // Emit global event
        this.globalEmitter.emit(EVENTS.STATE_CHANGED, {
            groupId,
            state: group.state,
            sourceInstance
        });
    }

    /**
     * Gets current group state
     * @param {string} groupId - Group identifier
     * @returns {Object|null} Current state or null if group doesn't exist
     */
    getGroupState(groupId) {
        const group = this.groups.get(groupId);
        return group ? { ...group.state } : null;
    }

    /**
     * Gets group information
     * @param {string} groupId - Group identifier
     * @returns {Object|null} Group info or null if group doesn't exist
     */
    getGroupInfo(groupId) {
        const group = this.groups.get(groupId);
        if (!group) return null;

        return {
            id: groupId,
            masterCount: group.master ? 1 : 0,
            slaveCount: group.slaves.size,
            totalCount: (group.master ? 1 : 0) + group.slaves.size,
            state: { ...group.state }
        };
    }

    /**
     * Lists all active groups
     * @returns {string[]} Array of group IDs
     */
    listGroups() {
        return Array.from(this.groups.keys());
    }

    /**
     * Subscribes to global group events
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     * @returns {Function} Unsubscribe function
     */
    onGlobal(event, callback) {
        return this.globalEmitter.on(event, callback);
    }

    /**
     * Sets up event listeners for a pagination instance
     * @private
     * @param {Object} group - Group object
     * @param {Object} instance - Pagination instance
     * @param {string} role - Instance role
     */
    _setupInstanceListeners(group, instance, role) {
        if (role === ROLES.MASTER) {
            // Master listens to its own state changes and propagates them
            instance.on(EVENTS.STATE_CHANGED, (state) => {
                this.updateGroupState(group.id, state, instance);
            });
        } else {
            // Slave listens to group state changes
            const unsubscribe = group.emitter.on(EVENTS.STATE_CHANGED, (groupState) => {
                if (groupState.sourceInstance !== instance) {
                    instance.updateFromGroup(groupState);
                }
            });

            // Store unsubscribe function for cleanup
            if (!instance._groupUnsubscribers) {
                instance._groupUnsubscribers = [];
            }
            instance._groupUnsubscribers.push(unsubscribe);
        }
    }

    /**
     * Forces synchronization of all instances in a group
     * @param {string} groupId - Group identifier
     */
    forceSyncGroup(groupId) {
        const group = this.groups.get(groupId);
        if (!group || !group.master) return;

        // Force master to emit current state
        group.emitter.emit(EVENTS.STATE_CHANGED, {
            ...group.state,
            sourceInstance: group.master,
            forceSync: true
        });
    }

    /**
     * Destroys the group manager and cleans up all groups
     */
    destroy() {
        this.groups.forEach(group => {
            group.emitter.removeAllListeners();
        });
        this.groups.clear();
        this.globalEmitter.removeAllListeners();
    }
}

// Global instance
export const globalGroupManager = new GroupManager();
