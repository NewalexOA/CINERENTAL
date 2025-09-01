import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseInput from '../BaseInput.vue'

describe('BaseInput.vue', () => {
  it('renders a label when provided', () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: '', label: 'My Input' },
    })
    expect(wrapper.find('label').text()).toContain('My Input')
  })

  it('updates the modelValue on input', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '' } })
    const input = wrapper.find('input')
    await input.setValue('hello')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['hello'])
  })

  it('shows an error message', () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: '', error: 'This field is required' },
    })
    expect(wrapper.find('.input__error').exists()).toBe(true)
    expect(wrapper.find('.input__error').text()).toBe('This field is required')
  })

  it('shows a hint message', () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: '', hint: 'Enter your name' },
    })
    expect(wrapper.find('.input__hint').exists()).toBe(true)
    expect(wrapper.find('.input__hint').text()).toBe('Enter your name')
  })

  it('does not show hint when an error is present', () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: '', hint: 'A hint', error: 'An error' },
    })
    expect(wrapper.find('.input__hint').exists()).toBe(false)
    expect(wrapper.find('.input__error').exists()).toBe(true)
  })

  it('becomes disabled when prop is true', () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '', disabled: true } })
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
  })

  it('shows a clearable icon and clears input when clicked', async () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: 'some text', clearable: true },
    })
    const clearIcon = wrapper.find('.input__icon--trailing')
    expect(clearIcon.exists()).toBe(true)

    await clearIcon.trigger('click')

    expect(wrapper.emitted('update:modelValue')![0]).toEqual([''])
    expect(wrapper.emitted().clear).toHaveLength(1)
  })

  it('exposes focus and blur methods', () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '' } })
    expect(wrapper.vm.focus).toBeDefined()
    expect(wrapper.vm.blur).toBeDefined()
  })
})
