import { useState } from 'react'
import { useNavigate } from 'react-router'

const prologueSlides = [
  {
    mark: '霧',
    kicker: '封鎖地・灰苔湿原',
    text: '灰苔湿原から、先遣隊が戻らない。',
  },
  {
    mark: '異',
    kicker: '残された異常',
    text: '停止した浄化施設。その周囲で、異獣たちは同じ行動を繰り返している。',
  },
  {
    mark: '録',
    kicker: '最初の任務',
    text: '新人調査員であるあなたは、師匠が残した最後の記録を追う。',
  },
] as const

export function ProloguePage() {
  const [slideIndex, setSlideIndex] = useState(0)
  const navigate = useNavigate()
  const slide = prologueSlides[slideIndex]
  const isLast = slideIndex === prologueSlides.length - 1

  function advance() {
    if (isLast) {
      navigate('/laboratory')
      return
    }
    setSlideIndex((current) => current + 1)
  }

  return (
    <main className="prologue-screen">
      <img
        className="prologue-background"
        src={`${import.meta.env.BASE_URL}art/title-graymoss.webp`}
        alt=""
      />
      <section className="prologue-panel" aria-live="polite">
        <div className="prologue-mark" aria-hidden="true">{slide.mark}</div>
        <p className="eyebrow">{slide.kicker}</p>
        <p className="prologue-copy">{slide.text}</p>
        <div className="prologue-progress" aria-label={`${slideIndex + 1}/${prologueSlides.length}`}>
          {prologueSlides.map((item, index) => (
            <span key={item.mark} className={index <= slideIndex ? 'active' : ''} />
          ))}
        </div>
        <button className="primary-button full-button" type="button" onClick={advance}>
          {isLast ? '辺境研究所へ' : '記録を読む'}
        </button>
        {!isLast && (
          <button className="prologue-skip" type="button" onClick={() => navigate('/laboratory')}>
            導入を省略
          </button>
        )}
      </section>
    </main>
  )
}
