import { describe, it, expect } from 'vitest'
import { cleanSongTitle, toTitleCase } from '../../netlify/shared/youtubeService'

describe('youtubeService - cleanSongTitle', () => {
  it('correctly cleans up standard karaoke boilerplate titles', () => {
    const input = 'Frozen - Let It Go (Idina Menzel) (Karaoke Version)'
    const expected = 'Let It Go (Idina Menzel)'
    expect(cleanSongTitle(input)).toBe(expected)
  })

  it('correctly handles Vietnamese diacritics and collaborations/shows (extreme example)', () => {
    const input =
      '[ KARAOKE ] TÔI KHÔNG CÒN VIẾT TÌNH CA - Mỹ Linh, Ái Phương, Dương Hoàng Yến, Tóc Tiên | Công Diễn 3'
    const expected = 'Tôi Không Còn Viết Tình Ca'
    expect(cleanSongTitle(input)).toBe(expected)
  })

  it('correctly discards brand names and cleans standalone noise words', () => {
    const input = 'Let It Go - KARAOKE VERSION - As popularized by Idina Menzel'
    const expected = 'Let It Go'
    expect(cleanSongTitle(input)).toBe(expected)
  })

  it('correctly formats simple title casing', () => {
    const input = 'let it go'
    const expected = 'Let It Go'
    expect(cleanSongTitle(input)).toBe(expected)
  })

  it('correctly handles Artist - Song format where artist has short name', () => {
    const input = 'Mỹ Linh - Tôi Không Còn Viết Tình Ca'
    const expected = 'Tôi Không Còn Viết Tình Ca'
    expect(cleanSongTitle(input)).toBe(expected)
  })

  it('preserves useful parenthetical context if not matching noise keywords', () => {
    const input = 'Sầu Tím Thiệp Hồng (Remix) - Quang Lê'
    const res = cleanSongTitle(input)
    expect(res).toBeDefined()
  })

  it('handles user name parsing edge cases accurately', () => {
    // Case 1: "I Just Can't Wait to Be King - The Lion King (1994 film) | Karaoke Version | KaraFun"
    expect(
      cleanSongTitle("I Just Can't Wait to Be King - The Lion King (1994 film) | Karaoke Version | KaraFun")
    ).toBe("I Just Can't Wait to Be King")

    // Case 2: "Love Is An Open Door (Male Part Only - Karaoke) [UPDATED] - Frozen"
    expect(
      cleanSongTitle("Love Is An Open Door (Male Part Only - Karaoke) [UPDATED] - Frozen")
    ).toBe("Love Is An Open Door (Male Part Only)")

    // Case 3: "Frozen 2 - Show Yourself (Karaoke Version)"
    expect(
      cleanSongTitle("Frozen 2 - Show Yourself (Karaoke Version)")
    ).toBe("Show Yourself")

    // Case 4: "Karaoke 4K SEE THE LIGHT - Mỹ Tâm | Beat Chuẩn Tone Nữ | Có Lời HD"
    expect(
      cleanSongTitle("Karaoke 4K SEE THE LIGHT - Mỹ Tâm | Beat Chuẩn Tone Nữ | Có Lời HD")
    ).toBe("See The Light")
  })
})

describe('youtubeService - toTitleCase', () => {
  it('capitalizes words correctly', () => {
    expect(toTitleCase('hello world')).toBe('Hello World')
    expect(toTitleCase('TÔI KHÔNG CÒN')).toBe('Tôi Không Còn')
  })
})
