import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Camera,
  ChevronLeft,
  UserRound,
} from 'lucide-react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  getMyPageProfile,
  updateMyPageProfile,
} from '../../api/myPageApi.js'

import './ProfileEditPage.css'

const MAX_PROFILE_IMAGE_SIZE =
  5 * 1024 * 1024

function ProfileEditPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [profile, setProfile] =
    useState(null)

  const [nickname, setNickname] =
    useState('')

  const [statusMessage, setStatusMessage] =
    useState('')

  const [
    profileImageFile,
    setProfileImageFile,
  ] = useState(null)

  const [
    previewImageUrl,
    setPreviewImageUrl,
  ] = useState('')

  const [isLoading, setIsLoading] =
    useState(true)

  const [isProcessing, setIsProcessing] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  useEffect(() => {
    let isCancelled = false

    getMyPageProfile()
      .then((profileData) => {
        if (isCancelled) {
          return
        }

        setProfile(profileData)
        setNickname(profileData.nickname)
        setStatusMessage(
          profileData.statusMessage ?? '',
        )
        setPreviewImageUrl(
          profileData.profileImageUrl ?? '',
        )
        setErrorMessage('')
        setIsLoading(false)
      })
      .catch((error) => {
        if (isCancelled) {
          return
        }

        setErrorMessage(
          error.message ||
            '프로필 정보를 불러오지 못했습니다.',
        )

        setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [])

  const handleBack = () => {
    if (isProcessing) {
      return
    }

    navigate('/mypage')
  }

  const openImagePicker = () => {
    if (isProcessing) {
      return
    }

    fileInputRef.current?.click()
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    const acceptedImageTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (
      !acceptedImageTypes.includes(file.type)
    ) {
      window.alert(
        'JPG, PNG 또는 WEBP 이미지만 선택할 수 있습니다.',
      )
      return
    }

    if (
      file.size > MAX_PROFILE_IMAGE_SIZE
    ) {
      window.alert(
        '프로필 사진은 5MB 이하만 선택할 수 있습니다.',
      )
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setProfileImageFile(file)
      setPreviewImageUrl(reader.result)
    }

    reader.onerror = () => {
      window.alert(
        '프로필 사진을 미리 볼 수 없습니다.',
      )
    }

    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedNickname =
      nickname.trim()

    if (
      !trimmedNickname ||
      isProcessing
    ) {
      return
    }

    try {
      setIsProcessing(true)

      await updateMyPageProfile({
        nickname: trimmedNickname,
        statusMessage,
        profileImageFile,
      })

      navigate('/mypage', {
        replace: true,
      })
    } catch (error) {
      window.alert(
        error.message ||
          '프로필 수정에 실패했습니다.',
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="profile-edit-page">
      <header className="profile-edit-header">
        <button
          type="button"
          className="profile-edit-back-button"
          aria-label="마이페이지로 돌아가기"
          disabled={isProcessing}
          onClick={handleBack}
        >
          <ChevronLeft
            size={22}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>

        <h1>프로필 수정</h1>

        <div className="profile-edit-header-spacer" />
      </header>

      <main className="profile-edit-scroll-area">
        {isLoading && (
          <div className="profile-edit-status">
            <span className="profile-edit-loading-spinner" />

            <p>
              프로필을 불러오고 있습니다.
            </p>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="profile-edit-status profile-edit-status-error">
            <p>{errorMessage}</p>

            <button
              type="button"
              onClick={handleBack}
            >
              마이페이지로 돌아가기
            </button>
          </div>
        )}

        {!isLoading &&
          !errorMessage &&
          profile && (
            <form
              className="profile-edit-form"
              onSubmit={handleSubmit}
            >
              <section className="profile-edit-image-section">
                <div className="profile-edit-image">
                  {previewImageUrl ? (
                    <img
                      src={previewImageUrl}
                      alt="프로필 사진 미리보기"
                    />
                  ) : (
                    <UserRound
                      size={50}
                      strokeWidth={1.6}
                      aria-hidden="true"
                    />
                  )}
                </div>

                <button
                  type="button"
                  className="profile-image-change-button"
                  disabled={isProcessing}
                  onClick={openImagePicker}
                >
                  <Camera
                    size={15}
                    strokeWidth={2}
                    aria-hidden="true"
                  />

                  <span>사진 변경</span>
                </button>

                <input
                  ref={fileInputRef}
                  className="profile-image-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                />

                <p className="profile-image-help">
                  JPG, PNG, WEBP · 최대 5MB
                </p>
              </section>

              <label className="profile-edit-field">
                <span className="profile-edit-field-label">
                  닉네임
                </span>

                <input
                  type="text"
                  value={nickname}
                  maxLength={20}
                  disabled={isProcessing}
                  placeholder="닉네임을 입력해주세요"
                  onChange={(event) =>
                    setNickname(
                      event.target.value,
                    )
                  }
                />

                <span className="profile-edit-count">
                  {nickname.length}/20
                </span>
              </label>

              <label className="profile-edit-field">
                <span className="profile-edit-field-label">
                  이메일
                </span>

                <input
                  type="email"
                  value={profile.email}
                  readOnly
                />

                <span className="profile-edit-help">
                  이메일은 변경할 수 없습니다.
                </span>
              </label>

              <label className="profile-edit-field">
                <span className="profile-edit-field-label">
                  상태 메시지
                </span>

                <textarea
                  value={statusMessage}
                  maxLength={50}
                  rows={3}
                  disabled={isProcessing}
                  placeholder="상태 메시지를 입력해주세요"
                  onChange={(event) =>
                    setStatusMessage(
                      event.target.value,
                    )
                  }
                />

                <span className="profile-edit-count">
                  {statusMessage.length}/50
                </span>
              </label>

              <div className="profile-edit-actions">
                <button
                  type="button"
                  className="profile-edit-cancel-button"
                  disabled={isProcessing}
                  onClick={handleBack}
                >
                  취소
                </button>

                <button
                  type="submit"
                  className="profile-edit-save-button"
                  disabled={
                    isProcessing ||
                    !nickname.trim()
                  }
                >
                  {isProcessing
                    ? '저장 중'
                    : '저장'}
                </button>
              </div>
            </form>
          )}
      </main>
    </div>
  )
}

export default ProfileEditPage