import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  Check,
  ImagePlus,
  Menu,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'

import {
  deleteAlbumPhoto,
  getAlbumPhotos,
  getChatPhotos,
  updateAlbumPhotoMemo,
  uploadAlbumPhoto,
} from '../../api/albumApi.js'

import BottomNavigation from '../../components/common/BottomNavigation/BottomNavigation.jsx'

import {
  PHOTO_SOURCE,
} from '../../mappers/albumMapper.js'

import './AlbumPage.css'

const TEMP_COUPLE_ROOM_ID = 1

const ALBUM_TABS = [
  {
    id: PHOTO_SOURCE.ALBUM,
    label: '앨범 사진',
  },
  {
    id: PHOTO_SOURCE.CHAT,
    label: '채팅 사진',
  },
]

function formatPhotoDate(value) {
  if (!value) {
    return '날짜 정보 없음'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10).replaceAll('-', '.')
  }

  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(date.getDate()).padStart(
    2,
    '0',
  )

  return `${year}.${month}.${day}`
}

function getPhotoDateLabel(source) {
  return source === PHOTO_SOURCE.ALBUM
    ? '등록일'
    : '전송일'
}

function AlbumPage() {
  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState(
    PHOTO_SOURCE.ALBUM,
  )

  const [photosBySource, setPhotosBySource] =
    useState({
      [PHOTO_SOURCE.ALBUM]: [],
      [PHOTO_SOURCE.CHAT]: [],
    })

  const [selectedPhotoId, setSelectedPhotoId] =
    useState(null)

  const [isLoading, setIsLoading] =
    useState(true)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [isMemoEditing, setIsMemoEditing] =
    useState(false)

  const [memoDraft, setMemoDraft] =
    useState('')

  const [isProcessing, setIsProcessing] =
    useState(false)

  const visiblePhotos = useMemo(
    () => photosBySource[activeTab] ?? [],
    [activeTab, photosBySource],
  )

  const selectedPhoto = useMemo(
    () =>
      visiblePhotos.find(
        (photo) => photo.id === selectedPhotoId,
      ) ?? null,
    [selectedPhotoId, visiblePhotos],
  )

  useEffect(() => {
    let isCancelled = false

    const request =
      activeTab === PHOTO_SOURCE.ALBUM
        ? getAlbumPhotos(TEMP_COUPLE_ROOM_ID)
        : getChatPhotos(TEMP_COUPLE_ROOM_ID)

    request
      .then((photos) => {
        if (isCancelled) {
          return
        }

        setPhotosBySource(
          (previousPhotosBySource) => ({
            ...previousPhotosBySource,
            [activeTab]: photos,
          }),
        )

        setSelectedPhotoId(
          photos[0]?.id ?? null,
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
            '사진을 불러오지 못했습니다.',
        )

        setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [activeTab])

  const handleTabChange = (tabId) => {
    if (tabId === activeTab) {
      return
    }

    setActiveTab(tabId)
    setSelectedPhotoId(null)
    setIsMemoEditing(false)
    setMemoDraft('')
    setErrorMessage('')
    setIsLoading(true)
  }

  const handlePhotoSelect = (photoId) => {
    setSelectedPhotoId(photoId)
    setIsMemoEditing(false)
    setMemoDraft('')
  }

  const openFilePicker = () => {
    if (isProcessing) {
      return
    }

    fileInputRef.current?.click()
  }

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      window.alert(
        '이미지 파일만 업로드할 수 있습니다.',
      )
      return
    }

    try {
      setIsProcessing(true)

      const uploadedPhoto =
        await uploadAlbumPhoto({
          coupleRoomId:
            TEMP_COUPLE_ROOM_ID,
          file,
          memo: '',
        })

      setPhotosBySource(
        (previousPhotosBySource) => ({
          ...previousPhotosBySource,
          [PHOTO_SOURCE.ALBUM]: [
            uploadedPhoto,
            ...previousPhotosBySource[
              PHOTO_SOURCE.ALBUM
            ],
          ],
        }),
      )

      setActiveTab(PHOTO_SOURCE.ALBUM)
      setSelectedPhotoId(uploadedPhoto.id)
      setIsMemoEditing(false)
      setMemoDraft('')
    } catch (error) {
      window.alert(
        error.message ||
          '사진 업로드에 실패했습니다.',
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePhotoDelete = async () => {
    if (
      !selectedPhoto ||
      !selectedPhoto.canDelete ||
      isProcessing
    ) {
      return
    }

    const shouldDelete = window.confirm(
      '선택한 사진을 삭제하시겠습니까?',
    )

    if (!shouldDelete) {
      return
    }

    try {
      setIsProcessing(true)

      await deleteAlbumPhoto(
        selectedPhoto.resourceId,
      )

      const nextPhotos = visiblePhotos.filter(
        (photo) =>
          photo.id !== selectedPhoto.id,
      )

      setPhotosBySource(
        (previousPhotosBySource) => ({
          ...previousPhotosBySource,
          [PHOTO_SOURCE.ALBUM]:
            nextPhotos,
        }),
      )

      setSelectedPhotoId(
        nextPhotos[0]?.id ?? null,
      )

      setIsMemoEditing(false)
      setMemoDraft('')
    } catch (error) {
      window.alert(
        error.message ||
          '사진 삭제에 실패했습니다.',
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const startMemoEditing = () => {
    if (
      !selectedPhoto ||
      !selectedPhoto.canEditMemo ||
      isProcessing
    ) {
      return
    }

    setMemoDraft(selectedPhoto.memo ?? '')
    setIsMemoEditing(true)
  }

  const cancelMemoEditing = () => {
    if (isProcessing) {
      return
    }

    setMemoDraft('')
    setIsMemoEditing(false)
  }

  const saveMemo = async () => {
    if (
      !selectedPhoto ||
      !selectedPhoto.canEditMemo ||
      isProcessing
    ) {
      return
    }

    try {
      setIsProcessing(true)

      const updatedPhoto =
        await updateAlbumPhotoMemo(
          selectedPhoto.resourceId,
          memoDraft,
        )

      setPhotosBySource(
        (previousPhotosBySource) => ({
          ...previousPhotosBySource,
          [PHOTO_SOURCE.ALBUM]:
            previousPhotosBySource[
              PHOTO_SOURCE.ALBUM
            ].map((photo) =>
              photo.id === updatedPhoto.id
                ? updatedPhoto
                : photo,
            ),
        }),
      )

      setMemoDraft(updatedPhoto.memo)
      setIsMemoEditing(false)
    } catch (error) {
      window.alert(
        error.message ||
          '사진 메모 수정에 실패했습니다.',
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="album-page">
      <header className="album-header">
        <button
          type="button"
          className="album-header-button"
          aria-label="메뉴 열기"
          onClick={() => {
            console.log('메뉴 열기')
          }}
        >
          <Menu
            size={22}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>

        <h1>앨범</h1>

        <button
          type="button"
          className="album-add-button"
          aria-label="앨범 사진 추가"
          disabled={isProcessing}
          onClick={openFilePicker}
        >
          <Plus
            size={23}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>

        <input
          ref={fileInputRef}
          className="album-file-input"
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
        />
      </header>

      <main className="album-scroll-area">
        <section className="album-content">
          <div
            className="album-tabs"
            role="tablist"
            aria-label="사진 종류"
          >
            {ALBUM_TABS.map((tab) => {
              const isActive =
                activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={[
                    'album-tab',
                    isActive
                      ? 'album-tab-active'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() =>
                    handleTabChange(tab.id)
                  }
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {isLoading && (
            <div className="album-status">
              <span className="album-loading-spinner" />

              <p>사진을 불러오고 있습니다.</p>
            </div>
          )}

          {!isLoading && errorMessage && (
            <div className="album-status album-error">
              <p>{errorMessage}</p>
            </div>
          )}

          {!isLoading &&
            !errorMessage &&
            visiblePhotos.length > 0 && (
              <div className="album-photo-grid">
                {visiblePhotos.map((photo) => {
                  const isSelected =
                    photo.id === selectedPhotoId

                  const photoDate =
                    formatPhotoDate(
                      photo.createdAt,
                    )

                  return (
                    <button
                      key={photo.id}
                      type="button"
                      className={[
                        'album-photo-item',
                        isSelected
                          ? 'album-photo-item-selected'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-label={`${photoDate} 사진 선택`}
                      aria-pressed={isSelected}
                      onClick={() =>
                        handlePhotoSelect(
                          photo.id,
                        )
                      }
                    >
                      <img
                        src={photo.imageUrl}
                        alt={`${photoDate}에 등록된 사진`}
                      />

                      {isSelected && (
                        <span className="album-photo-check">
                          <Check
                            size={15}
                            strokeWidth={3}
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

          {!isLoading &&
            !errorMessage &&
            visiblePhotos.length === 0 && (
              <div className="album-empty-state">
                <span>
                  <ImagePlus
                    size={32}
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </span>

                <strong>
                  {activeTab ===
                  PHOTO_SOURCE.ALBUM
                    ? '등록된 앨범 사진이 없습니다.'
                    : '공유된 채팅 사진이 없습니다.'}
                </strong>

                {activeTab ===
                  PHOTO_SOURCE.ALBUM && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={openFilePicker}
                  >
                    사진 추가하기
                  </button>
                )}
              </div>
            )}

          {selectedPhoto && (
            <section className="album-detail-card">
              <div className="album-detail-header">
                <img
                  src={selectedPhoto.imageUrl}
                  alt={`${formatPhotoDate(
                    selectedPhoto.createdAt,
                  )}에 등록된 사진`}
                />

                <div className="album-detail-information">
                  <span className="album-source-badge">
                    {selectedPhoto.source ===
                    PHOTO_SOURCE.ALBUM
                      ? '앨범 사진'
                      : '채팅 사진'}
                  </span>

                  <dl>
                    <div>
                      <dt>
                        {getPhotoDateLabel(
                          selectedPhoto.source,
                        )}
                      </dt>

                      <dd>
                        <time
                          dateTime={
                            selectedPhoto.createdAt
                          }
                        >
                          {formatPhotoDate(
                            selectedPhoto.createdAt,
                          )}
                        </time>
                      </dd>
                    </div>
                  </dl>
                </div>

                {selectedPhoto.canDelete && (
                  <button
                    type="button"
                    className="album-delete-button"
                    aria-label="선택한 사진 삭제"
                    disabled={isProcessing}
                    onClick={handlePhotoDelete}
                  >
                    <Trash2
                      size={18}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>

              {selectedPhoto.canEditMemo ? (
                <div className="album-memo-section">
                  <div className="album-memo-header">
                    <h2>사진 메모</h2>

                    {!isMemoEditing && (
                      <button
                        type="button"
                        className="album-memo-edit-button"
                        disabled={isProcessing}
                        onClick={startMemoEditing}
                      >
                        <Pencil
                          size={13}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        <span>수정</span>
                      </button>
                    )}
                  </div>

                  {isMemoEditing ? (
                    <div className="album-memo-editor">
                      <textarea
                        value={memoDraft}
                        rows={3}
                        disabled={isProcessing}
                        placeholder="이 사진에 대한 추억을 기록해주세요"
                        onChange={(event) =>
                          setMemoDraft(
                            event.target.value,
                          )
                        }
                      />

                      <div className="album-memo-actions">
                        <button
                          type="button"
                          className="album-memo-cancel-button"
                          disabled={isProcessing}
                          onClick={cancelMemoEditing}
                        >
                          취소
                        </button>

                        <button
                          type="button"
                          className="album-memo-save-button"
                          disabled={isProcessing}
                          onClick={saveMemo}
                        >
                          {isProcessing
                            ? '저장 중'
                            : '저장'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="album-memo-content">
                      {selectedPhoto.memo ||
                        '작성된 사진 메모가 없습니다.'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="chat-photo-information">
                  <p>
                    채팅방에서 공유된 사진입니다.
                  </p>

                  <span>
                    메모 수정과 삭제는 앨범
                    사진에서만 가능합니다.
                  </span>
                </div>
              )}
            </section>
          )}
        </section>
      </main>

      <BottomNavigation />
    </div>
  )
}

export default AlbumPage