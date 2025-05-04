/**
 * Project actions functionality
 */

import { api } from '../utils/api.js';
import { showToast } from '../utils/common.js';
import { renderProjectDetails } from './project-details.js';

/**
 * Update project status
 * @param {string} projectId - Project ID
 * @param {string} status - New status
 */
export async function updateProjectStatus(projectId, status) {
    try {
        await api.patch(`/projects/${projectId}`, { status });
        const completeProjectData = await api.get(`/projects/${projectId}`);
        renderProjectDetails(completeProjectData);
        showToast('Статус проекта обновлен', 'success');
    } catch (error) {
        console.error('Error updating project status:', error);
        showToast('Ошибка при обновлении статуса', 'danger');
    }
}

/**
 * Delete project
 * @param {string} projectId - Project ID
 */
export async function deleteProject(projectId) {
    if (!confirm('Вы уверены, что хотите удалить этот проект?')) {
        return;
    }

    try {
        await api.delete(`/projects/${projectId}`);
        window.location.href = '/projects';
    } catch (error) {
        console.error('Error deleting project:', error);
        showToast('Ошибка при удалении проекта', 'danger');
    }
}
