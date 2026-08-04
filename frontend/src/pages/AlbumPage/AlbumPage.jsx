import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  ImageOff,
  ImagePlus,
  Images,
  MessageCircle,
  PencilLine,
  Trash2,
  X,
} from 'lucide-react'

import {
  deleteAlbumPhoto,
  deleteChatPhoto,
  getAlbumPhotos,
  uploadAlbumPhoto,
} from '../../api/albumApi.js'

import BottomNavigation from '../../components/common/BottomNavigation/BottomNavigation.jsx'
import { useLiveSync } from '../../hooks/useLiveSync.js'
import { getCurrentUser } from '../../api/authApi.js'

import './AlbumPage.css'

const ALBUM_TABS = [
  {
    id: 'ALBUM',
    label: '앨범 사진',
    icon: Images,
  },
  {
    id: 'CHAT',
    label: '채팅 사진',
    icon: MessageCircle,
  },
]

const INITIAL_PHOTOS = {
  ALBUM: [],
  CHAT: [],
}

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024

const MAX_MEMO_LENGTH = 500

function formatPhotoDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat(
    'ko-KR',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  ).format(date)
}

function AlbumPage() {
  const fileInputRef = useRef(null)
  const currentUserId = getCurrentUser()?.userId ?? null

  const [activeTab, setActiveTab] =
    useState('ALBUM')

  const [
    photosBySource,
    setPhotosBySource,
  ] = useState(INITIAL_PHOTOS)

  const [
    selectedPhoto,
    setSelectedPhoto,
  ] = useState(null)

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState(null)

  const [
    uploadFile,
    setUploadFile,
  ] = useState(null)

  const [
    uploadPreviewUrl,
    setUploadPreviewUrl,
  ] = useState('')

  const [
    uploadMemo,
    setUploadMemo,
  ] = useState('')

  const [
    isUploadModalOpen,
    setIsUploadModalOpen,
  ] = useState(false)

  const [isLoading, setIsLoading] =
    useState(true)

  const [isUploading, setIsUploading] =
    useState(false)

  const [isDeleting, setIsDeleting] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [
    noticeMessage,
    setNoticeMessage,
  ] = useState('')

  /*
   * 앨범 사진과 채팅 사진을 조회합니다.
   */
  const loadPhotos = useCallback(
    async () => {
      try {
        const response =
          await getAlbumPhotos()

        setPhotosBySource({
          ALBUM:
            response.albumPhotos ?? [],
          CHAT:
            response.chatPhotos ?? [],
        })
        setErrorMessage('')
      } catch (error) {
        setErrorMessage(
          error.message ||
            '사진을 불러오지 못했습니다.',
        )
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    Promise.resolve().then(loadPhotos)
  }, [loadPhotos])

  useLiveSync(loadPhotos)

  /*
   * URL.createObjectURL로 만든
   * 미리보기 주소를 정리합니다.
   */
  useEffect(() => {
    return () => {
      if (uploadPreviewUrl) {
        URL.revokeObjectURL(
          uploadPreviewUrl,
        )
      }
    }
  }, [uploadPreviewUrl])

  const visiblePhotos = useMemo(
    () =>
      photosBySource[activeTab] ?? [],
    [activeTab, photosBySource],
  )

  const showNotice = (message) => {
    setNoticeMessage(message)

    window.setTimeout(() => {
      setNoticeMessage('')
    }, 2200)
  }

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setSelectedPhoto(null)
  }

  /*
   * 상단의 사진 추가 버튼에서는
   * 파일 탐색기를 바로 열지 않고
   * 먼저 사진 등록 모달을 엽니다.
   */
  const openUploadModal = () => {
    if (isUploading) {
      return
    }

    setUploadFile(null)
    setUploadPreviewUrl('')
    setUploadMemo('')
    setIsUploadModalOpen(true)
  }

  /*
   * 등록 모달 내부의 사진 선택 버튼에서
   * 실제 파일 탐색기를 엽니다.
   */
  const openFilePicker = () => {
    if (isUploading) {
      return
    }

    fileInputRef.current?.click()
  }

  const resetUploadForm = () => {
    setUploadFile(null)
    setUploadPreviewUrl('')
    setUploadMemo('')
    setIsUploadModalOpen(false)
  }

  const closeUploadModal = () => {
    if (isUploading) {
      return
    }

    resetUploadForm()
  }

  /*
   * 파일을 선택하면 업로드하지 않고
   * 미리보기와 선택 파일만 저장합니다.
   */
  const handleFileChange = (event) => {
    const file =
      event.target.files?.[0]

    /*
     * 같은 파일을 다시 선택해도
     * change 이벤트가 발생하도록 초기화합니다.
     */
    event.target.value = ''

    if (!file) {
      return
    }

    if (
      !ALLOWED_IMAGE_TYPES.includes(
        file.type,
      )
    ) {
      window.alert(
        'JPG, PNG, WEBP 이미지 파일만 등록할 수 있습니다.',
      )
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      window.alert(
        '사진은 10MB 이하만 등록할 수 있습니다.',
      )
      return
    }

    const previewUrl =
      URL.createObjectURL(file)

    setUploadFile(file)
    setUploadPreviewUrl(previewUrl)
  }

  /*
   * 등록 버튼을 눌렀을 때
   * 선택한 사진과 메모를 함께 전송합니다.
   */
  const handleUploadSubmit = async (
    event,
  ) => {
    event.preventDefault()

    if (!uploadFile || isUploading) {
      return
    }

    try {
      setIsUploading(true)

      const createdPhoto =
        await uploadAlbumPhoto({
          file: uploadFile,
          memo: uploadMemo.trim(),
        })

      if (!createdPhoto) {
        throw new Error(
          '등록된 사진 정보를 확인하지 못했습니다.',
        )
      }

      setPhotosBySource(
        (previous) => ({
          ...previous,

          ALBUM: [
            createdPhoto,
            ...previous.ALBUM,
          ],
        }),
      )

      setActiveTab('ALBUM')
      resetUploadForm()

      showNotice(
        '앨범에 사진이 추가되었습니다.',
      )
    } catch (error) {
      window.alert(
        error.message ||
          '사진을 추가하지 못했습니다.',
      )
    } finally {
      setIsUploading(false)
    }
  }

  const openPhoto = (photo) => {
    setSelectedPhoto(photo)
  }

  const closePhoto = () => {
    if (isDeleting) {
      return
    }

    setSelectedPhoto(null)
  }

  const openDeleteConfirm = (photo) => {
    if (isDeleting) {
      return
    }

    setDeleteTarget(photo)
  }

  const closeDeleteConfirm = () => {
    if (isDeleting) {
      return
    }

    setDeleteTarget(null)
  }

  const handleDeletePhoto = async () => {
    if (
      !deleteTarget ||
      isDeleting
    ) {
      return
    }

    try {
      setIsDeleting(true)

      if (
        deleteTarget.source ===
        'ALBUM'
      ) {
        await deleteAlbumPhoto(
          deleteTarget.photoId,
        )
      } else {
        await deleteChatPhoto(
          deleteTarget.imageId,
        )
      }

      setPhotosBySource(
        (previous) => ({
          ...previous,

          [deleteTarget.source]:
            previous[
              deleteTarget.source
            ].filter(
              (photo) =>
                photo.id !==
                deleteTarget.id,
            ),
        }),
      )

      setSelectedPhoto(null)

      if (
        deleteTarget.source ===
        'CHAT'
      ) {
        showNotice(
          '채팅 사진이 삭제되었습니다.',
        )
      } else {
        showNotice(
          '앨범 사진이 삭제되었습니다.',
        )
      }

      setDeleteTarget(null)
    } catch (error) {
      window.alert(
        error.message ||
          '사진을 삭제하지 못했습니다.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="album-page">
      {/* 캘린더·마이페이지와 같은 상단바: 가운데 제목 하나, 동작 버튼은 오른쪽에 얹는다 */}
      <header className="album-header">
        <h1>앨범</h1>

        <button
          type="button"
          className="album-add-button"
          disabled={isUploading}
          onClick={openUploadModal}
        >
          <ImagePlus
            size={18}
            strokeWidth={1.9}
            aria-hidden="true"
          />

          <span>사진 추가</span>
        </button>

        <input
          ref={fileInputRef}
          className="album-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
        />
      </header>

      <main className="album-content">
        <nav
          className="album-tabs"
          aria-label="앨범 사진 종류"
        >
          {ALBUM_TABS.map((tab) => {
            const Icon = tab.icon

            const isActive =
              activeTab === tab.id

            return (
              <button
                key={tab.id}
                type="button"
                className={
                  isActive
                    ? 'album-tab album-tab-active'
                    : 'album-tab'
                }
                onClick={() =>
                  handleTabChange(
                    tab.id,
                  )
                }
              >
                <Icon
                  size={17}
                  strokeWidth={1.9}
                  aria-hidden="true"
                />

                <span>{tab.label}</span>

                <strong>
                  {
                    photosBySource[
                      tab.id
                    ].length
                  }
                </strong>
              </button>
            )
          })}
        </nav>

        {/* 섹션 제목은 대시보드와 같은 공용 서식을 쓴다 (styles/surfaces.css) */}
        <section className="album-section">
          <header className="section-head">
            <h2 className="section-title">
              {activeTab === 'ALBUM'
                ? '앨범에 추가한 사진'
                : '채팅에서 보낸 사진'}
            </h2>

            <span className="section-meta">
              {visiblePhotos.length}장
            </span>
          </header>

          {isLoading && (
            <div className="album-status">
              <span className="album-loading-spinner" />

              <p>
                사진을 불러오고 있습니다.
              </p>
            </div>
          )}

          {!isLoading &&
            errorMessage && (
              <div className="album-status album-status-error">
                <ImageOff
                  size={30}
                  strokeWidth={1.6}
                  aria-hidden="true"
                />

                <p>{errorMessage}</p>
              </div>
            )}

          {!isLoading &&
            !errorMessage &&
            visiblePhotos.length ===
              0 && (
              <div className="album-status">
                <ImageOff
                  size={32}
                  strokeWidth={1.6}
                  aria-hidden="true"
                />

                <h3>
                  {activeTab === 'ALBUM'
                    ? '아직 추가한 사진이 없어요'
                    : '채팅 사진이 없어요'}
                </h3>

                <p>
                  {activeTab === 'ALBUM'
                    ? '사진 추가 버튼으로 추억을 남겨보세요.'
                    : '채팅으로 주고받은 사진이 여기에 표시돼요.'}
                </p>
              </div>
            )}

          {!isLoading &&
            !errorMessage &&
            visiblePhotos.length >
              0 && (
              /*
                모자이크는 사진이 넉넉할 때만 리듬이 된다.
                4장 이하에서는 큰 칸 하나가 화면을 다 먹어 오히려 어색하므로
                균등 격자로 되돌린다.
              */
              <div
                className={`album-grid ${
                  visiblePhotos.length <= 4
                    ? 'album-grid-uniform'
                    : ''
                }`}
              >
                {visiblePhotos.map(
                  (photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      className="album-photo-card"
                      onClick={() =>
                        openPhoto(photo)
                      }
                    >
                      <img
                        src={
                          photo.imageUrl
                        }
                        alt={
                          photo.memo ||
                          '앨범 사진'
                        }
                      />

                      <span className="album-photo-overlay">
                        {formatPhotoDate(
                          photo.createdAt,
                        )}
                      </span>
                    </button>
                  ),
                )}
              </div>
            )}
        </section>
      </main>

      <BottomNavigation />

      {noticeMessage && (
        <div
          className="album-toast"
          role="status"
        >
          {noticeMessage}
        </div>
      )}

      {/* 사진 등록 모달 */}
      {isUploadModalOpen && (
        <div
          className="album-upload-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeUploadModal()
            }
          }}
        >
          <section
            className="album-upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="album-upload-title"
          >
            <header className="album-upload-header">
              <div>
                <p>NEW MEMORY</p>

                <h2 id="album-upload-title">
                  사진 추가
                </h2>
              </div>

              <button
                type="button"
                aria-label="사진 등록 닫기"
                disabled={isUploading}
                onClick={closeUploadModal}
              >
                <X
                  size={21}
                  aria-hidden="true"
                />
              </button>
            </header>

            <form
              className="album-upload-form"
              onSubmit={
                handleUploadSubmit
              }
            >
              <div
                className={
                  uploadPreviewUrl
                    ? 'album-upload-preview album-upload-preview-selected'
                    : 'album-upload-preview'
                }
              >
                {uploadPreviewUrl ? (
                  <img
                    src={
                      uploadPreviewUrl
                    }
                    alt="등록할 사진 미리보기"
                  />
                ) : (
                  <button
                    type="button"
                    className="album-upload-select-area"
                    disabled={isUploading}
                    onClick={
                      openFilePicker
                    }
                  >
                    <span className="album-upload-select-icon">
                      <ImagePlus
                        size={30}
                        strokeWidth={1.7}
                        aria-hidden="true"
                      />
                    </span>

                    <strong>
                      등록할 사진을 선택해주세요
                    </strong>

                    <span className="album-upload-select-description">
                      JPG, PNG, WEBP · 최대 10MB
                    </span>

                    <span className="album-upload-select-label">
                      사진 선택
                    </span>
                  </button>
                )}
              </div>

              {uploadFile && (
                <button
                  type="button"
                  className="album-upload-change-button"
                  disabled={isUploading}
                  onClick={openFilePicker}
                >
                  <ImagePlus
                    size={16}
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />

                  <span>
                    다른 사진 선택
                  </span>
                </button>
              )}

              <label className="album-upload-memo-field">
                <span>
                  <PencilLine
                    size={15}
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />

                  추억 기록
                </span>

                <textarea
                  value={uploadMemo}
                  maxLength={
                    MAX_MEMO_LENGTH
                  }
                  disabled={isUploading}
                  placeholder="사진에 대한 추억을 기록해보세요."
                  onChange={(event) =>
                    setUploadMemo(
                      event.target.value,
                    )
                  }
                />
              </label>

              <div className="album-upload-memo-footer">
                <span>
                  메모 없이 사진만 등록해도 괜찮아요.
                </span>

                <strong>
                  {uploadMemo.length}/
                  {MAX_MEMO_LENGTH}
                </strong>
              </div>

              <div className="album-upload-actions">
                <button
                  type="button"
                  className="album-upload-cancel"
                  disabled={isUploading}
                  onClick={
                    closeUploadModal
                  }
                >
                  취소
                </button>

                <button
                  type="submit"
                  className="album-upload-submit"
                  disabled={
                    !uploadFile ||
                    isUploading
                  }
                >
                  {isUploading
                    ? '등록 중'
                    : '등록'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* 사진 상세 모달 */}
      {selectedPhoto && (
        <div
          className="album-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePhoto()
            }
          }}
        >
          <section
            className="album-photo-modal"
            role="dialog"
            aria-modal="true"
            aria-label="사진 상세 보기"
          >
            <header>
              <div>
                <p>
                  {selectedPhoto.source ===
                  'ALBUM'
                    ? '앨범 사진'
                    : '채팅 사진'}
                </p>

                <span>
                  {formatPhotoDate(
                    selectedPhoto.createdAt,
                  )}
                </span>
              </div>

              <button
                type="button"
                aria-label="사진 상세 닫기"
                disabled={isDeleting}
                onClick={closePhoto}
              >
                <X
                  size={21}
                  aria-hidden="true"
                />
              </button>
            </header>

            <div className="album-photo-modal-image">
              <img
                src={
                  selectedPhoto.imageUrl
                }
                alt={
                  selectedPhoto.memo ||
                  '앨범 사진'
                }
              />
            </div>

            {selectedPhoto.memo && (
              <p className="album-photo-memo">
                {selectedPhoto.memo}
              </p>
            )}

            {(selectedPhoto.source !== 'CHAT' ||
              Number(selectedPhoto.senderId) === Number(currentUserId)) && (
              <button
                type="button"
                className="album-photo-delete-button"
                disabled={isDeleting}
                onClick={() =>
                  openDeleteConfirm(
                    selectedPhoto,
                  )
                }
              >
                <Trash2
                  size={17}
                  strokeWidth={1.9}
                  aria-hidden="true"
                />

                <span>사진 삭제</span>
              </button>
            )}
          </section>
        </div>
      )}

      {/* 사진 삭제 확인 모달 */}
      {deleteTarget && (
        <div
          className="album-delete-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDeleteConfirm()
            }
          }}
        >
          <section
            className="album-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="album-delete-title"
          >
            <span className="album-delete-icon">
              <Trash2
                size={24}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </span>

            <h2 id="album-delete-title">
              사진을 삭제할까요?
            </h2>

            <p>
              {deleteTarget.source ===
              'CHAT'
                ? '앨범에서 사진이 삭제되며, 채팅에서는 삭제된 이미지로 표시됩니다. 삭제한 사진은 복구할 수 없습니다.'
                : '앨범에서 사진이 삭제됩니다. 삭제한 사진은 복구할 수 없습니다.'}
            </p>

            <div className="album-delete-actions">
              <button
                type="button"
                className="album-delete-cancel"
                disabled={isDeleting}
                onClick={
                  closeDeleteConfirm
                }
              >
                취소
              </button>

              <button
                type="button"
                className="album-delete-submit"
                disabled={isDeleting}
                onClick={
                  handleDeletePhoto
                }
              >
                {isDeleting
                  ? '삭제 중'
                  : '삭제'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default AlbumPage
