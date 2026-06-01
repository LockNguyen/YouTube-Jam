import { ref, computed } from 'vue'
import { extractVideoId, isValidYoutubeUrl } from '@/utils/youtubeUrl'

export function useSongValidation() {
  const url = ref('')
  const error = ref<string | null>(null)

  const videoId = computed(() => extractVideoId(url.value))
  const isValid = computed(() => isValidYoutubeUrl(url.value))

  function validate(): boolean {
    if (!url.value.trim()) {
      error.value = 'Please enter a YouTube URL'
      return false
    }
    if (!isValid.value) {
      error.value = 'Please enter a valid YouTube URL (youtube.com or youtu.be)'
      return false
    }
    error.value = null
    return true
  }

  function clear() {
    url.value = ''
    error.value = null
  }

  return { url, error, videoId, isValid, validate, clear }
}
