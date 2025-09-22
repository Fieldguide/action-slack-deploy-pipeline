import {describe, it, expect} from '@jest/globals'
import {isMemberWithProfile, isMessageAuthor} from '../types'

describe('isMemberWithProfile', () => {
  it('returns true for valid MemberWithProfile', () => {
    const valid = {
      profile: {
        real_name: 'John Doe',
        display_name: 'johnd',
        image_48: 'https://example.com/image.png'
      }
    }
    expect(isMemberWithProfile(valid)).toBe(true)
  })

  it('returns false if display_name is missing', () => {
    const missingDisplayName = {
      profile: {
        real_name: 'John Doe',
        image_48: 'https://example.com/image.png'
      }
    }
    expect(isMemberWithProfile(missingDisplayName)).toBe(false)
  })

  it('returns false if image_48 is missing', () => {
    const missingImage = {
      profile: {
        real_name: 'John Doe',
        display_name: 'johnd'
      }
    }
    expect(isMemberWithProfile(missingImage)).toBe(false)
  })

  it('returns false if profile is null', () => {
    expect(isMemberWithProfile({profile: null})).toBe(false)
  })

  it('returns false for empty object', () => {
    expect(isMemberWithProfile({})).toBe(false)
  })
})

describe('isMessageAuthor', () => {
  it('returns true for valid MessageAuthor', () => {
    const valid = {
      username: 'bot',
      icon_url: 'https://example.com/icon.png'
    }
    expect(isMessageAuthor(valid)).toBe(true)
  })

  it('returns false if username is missing', () => {
    const missingUsername = {
      icon_url: 'https://example.com/icon.png'
    }
    expect(isMessageAuthor(missingUsername)).toBe(false)
  })

  it('returns false if icon_url is missing', () => {
    const missingIcon = {
      username: 'bot'
    }
    expect(isMessageAuthor(missingIcon)).toBe(false)
  })

  it('returns false for non-object', () => {
    expect(isMessageAuthor('not-an-object')).toBe(false)
  })

  it('returns false for empty object', () => {
    expect(isMessageAuthor({})).toBe(false)
  })
})
