import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DataTable from '../DataTable.vue';
import { axe } from 'vitest-axe';

describe('DataTable.vue', () => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
  ];

  const data = [
    { name: 'John Doe', email: 'john.doe@example.com' },
    { name: 'Jane Doe', email: 'jane.doe@example.com' },
  ];

  it('renders headers correctly', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns,
        data,
      },
    });

    const headers = wrapper.findAll('th');
    expect(headers.length).toBe(columns.length);
    columns.forEach((column, index) => {
      expect(headers[index].text()).toBe(column.label);
    });
  });

  it('renders data correctly', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns,
        data,
      },
    });

    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(data.length);

    rows.forEach((row, rowIndex) => {
      const cells = row.findAll('td');
      expect(cells.length).toBe(columns.length);
      columns.forEach((column, colIndex) => {
        expect(cells[colIndex].text()).toBe(data[rowIndex][column.key]);
      });
    });
  });

  it('renders custom slot content', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns: [...columns, { key: 'actions', label: 'Actions' }],
        data,
      },
      slots: {
        'cell-actions': '<button>Edit</button>',
      },
    });

    const actionCell = wrapper.find('tbody tr:first-child td:last-child');
    expect(actionCell.find('button').exists()).toBe(true);
    expect(actionCell.find('button').text()).toBe('Edit');
  });

  it('should not have any accessibility violations', async () => {
    const wrapper = mount(DataTable, {
      props: {
        columns,
        data,
      },
    });
    expect(await axe(wrapper.element)).toHaveNoViolations();
  });
});
