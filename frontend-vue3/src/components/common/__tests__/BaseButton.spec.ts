import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '../BaseButton.vue'
import BaseSpinner from '../BaseSpinner.vue'
import BaseIcon from '../BaseIcon.vue'

describe('BaseButton.vue', () => {
  it('renders a button by default', () => {
    const wrapper = mount(BaseButton)
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('renders a link when tag is "a"', () => {
    const wrapper = mount(BaseButton, { props: { tag: 'a' } })
    expect(wrapper.find('a').exists()).toBe(true)
  })

  it('renders slot content', () => {
    const wrapper = mount(BaseButton, {
      slots: {
        default: 'Click Me'
      }
    })
    expect(wrapper.text()).toContain('Click Me')
  })

  it('applies variant and size classes', () => {
    const wrapper = mount(BaseButton, {
      props: { variant: 'danger', size: 'lg' }
    })
    expect(wrapper.classes()).toContain('button--danger')
    expect(wrapper.classes()).toContain('button--lg')
  })

  it('emits a click event when clicked', async () => {
    const wrapper = mount(BaseButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted().click).toHaveLength(1)
  })

  it('does not emit a click event when disabled', async () => {
    const wrapper = mount(BaseButton, { props: { disabled: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted().click).toBeUndefined()
  })

  it('does not emit a click event when loading', async () => {
    const wrapper = mount(BaseButton, { props: { loading: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted().click).toBeUndefined()
  })

  it('shows a spinner and is disabled when loading', () => {
    const wrapper = mount(BaseButton, { props: { loading: true } })
    expect(wrapper.findComponent(BaseSpinner).exists()).toBe(true)
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('shows an icon', () => {
    const wrapper = mount(BaseButton, { props: { icon: 'star' } })
    const icon = wrapper.findComponent(BaseIcon)
    expect(icon.exists()).toBe(true)
    expect(icon.props('name')).toBe('star')
  })
})
