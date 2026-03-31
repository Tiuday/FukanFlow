import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const AVATARS = [
  { id: 'Alex',   label: 'Alex'   },
  { id: 'Jordan', label: 'Jordan' },
  { id: 'Sam',    label: 'Sam'    },
  { id: 'Riley',  label: 'Riley'  },
  { id: 'Casey',  label: 'Casey'  },
  { id: 'Morgan', label: 'Morgan' },
  { id: 'Avery',  label: 'Avery'  },
  { id: 'Quinn',  label: 'Quinn'  },
]

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`
}

// Animation variants matching the 21st.dev reference
const mainAvatarVariants = {
  initial: { y: 20, opacity: 0 },
  animate: {
    y: 0, opacity: 1,
    transition: { type: 'spring' as const, stiffness: 200, damping: 20 },
  },
  exit: { y: -20, opacity: 0, transition: { duration: 0.2 } },
}

const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

const itemVariants = {
  initial: { y: 20, opacity: 0 },
  animate: {
    y: 0, opacity: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
  },
}

const selectedRingVariants = {
  initial: { opacity: 0, rotate: -180 },
  animate: {
    opacity: 1, rotate: 0,
    transition: { type: 'spring' as const, stiffness: 200, damping: 15 },
  },
  exit: { opacity: 0, rotate: 180, transition: { duration: 0.2 } },
}

interface Props {
  currentSeed: string | null
  onSelect: (seed: string) => void
  onClose: () => void
}

export function AvatarPicker({ currentSeed, onSelect, onClose }: Props) {
  const initial = AVATARS.find(a => a.id === currentSeed) ?? AVATARS[0]
  const [selected, setSelected] = useState(initial)
  const [rotationCount, setRotationCount] = useState(0)

  function handleSelect(avatar: typeof AVATARS[0]) {
    setRotationCount(prev => prev + 1080)
    setSelected(avatar)
  }

  function handleConfirm() {
    onSelect(selected.id)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(7,6,20,0.82)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 32, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 32, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 24,
          overflow: 'hidden',
          border: '1px solid rgba(248,248,252,0.1)',
          background: 'linear-gradient(180deg, #0f0e24 0%, #0b0a1e 100%)',
        }}
      >
        {/* Gradient header — matches 21st.dev from-primary/20 to-primary/10 */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: 1, height: 96,
            transition: { height: { type: 'spring', stiffness: 100, damping: 20 } },
          }}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, rgba(109,106,240,0.25) 0%, rgba(109,106,240,0.08) 100%)',
          }}
        />

        <div style={{ padding: '0 32px 32px', marginTop: -80 }}>

          {/* Large preview circle */}
          <motion.div
            variants={mainAvatarVariants}
            initial="initial"
            animate="animate"
            style={{
              width: 160, height: 160,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid rgba(109,106,240,0.6)',
              background: '#0d0c22',
              margin: '0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 40px rgba(109,106,240,0.25)',
            }}
          >
            <motion.img
              key={selected.id}
              src={avatarUrl(selected.id)}
              alt={selected.label}
              animate={{ rotate: rotationCount }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </motion.div>

          {/* Name + subtitle */}
          <motion.div
            style={{ textAlign: 'center', marginTop: 16, marginBottom: 28 }}
            variants={itemVariants}
            initial="initial"
            animate="animate"
          >
            <AnimatePresence mode="wait">
              <motion.h2
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                style={{
                  fontFamily: 'var(--font-head)',
                  fontSize: 22, fontWeight: 800,
                  color: '#F8F8FC',
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
              >
                {selected.label}
              </motion.h2>
            </AnimatePresence>
            <p style={{
              fontSize: 13,
              color: 'rgba(248,248,252,0.38)',
              margin: '4px 0 0',
            }}>
              Select your avatar
            </p>
          </motion.div>

          {/* Avatar selector row */}
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 24,
            }}
          >
            {AVATARS.map((avatar) => {
              const isSelected = avatar.id === selected.id
              return (
                <motion.button
                  key={avatar.id}
                  variants={itemVariants}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  whileTap={{ y: 0, transition: { duration: 0.2 } }}
                  onClick={() => handleSelect(avatar)}
                  aria-label={`Select ${avatar.label}`}
                  aria-pressed={isSelected}
                  style={{
                    position: 'relative',
                    width: 48, height: 48,
                    borderRadius: '50%',
                    overflow: 'visible',
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={avatarUrl(avatar.id)}
                    alt={avatar.label}
                    width={48}
                    height={48}
                    style={{
                      borderRadius: '50%',
                      display: 'block',
                      border: '2px solid rgba(248,248,252,0.08)',
                    }}
                  />
                  {/* Spring ring on selected — matches selectedVariants */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        variants={selectedRingVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        layoutId="selectedIndicator"
                        style={{
                          position: 'absolute',
                          inset: -4,
                          borderRadius: '50%',
                          border: '2px solid #6d6af0',
                          boxShadow: '0 0 0 3px rgba(13,12,34,1), 0 0 12px rgba(109,106,240,0.5)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            })}
          </motion.div>

          {/* Confirm button */}
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            style={{
              width: '100%',
              padding: '13px 0',
              borderRadius: 12,
              border: 'none',
              background: '#6d6af0',
              color: '#fff',
              fontFamily: 'var(--font-head)',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(109,106,240,0.35)',
              marginBottom: currentSeed ? 10 : 0,
            }}
          >
            Choose {selected.label}
          </motion.button>

          {/* Remove option */}
          {currentSeed && (
            <button
              onClick={() => { onSelect(''); onClose() }}
              style={{
                width: '100%', padding: '8px 0',
                border: 'none', background: 'none',
                color: 'rgba(248,248,252,0.28)',
                fontSize: 12, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Remove avatar
            </button>
          )}

        </div>
      </motion.div>
    </motion.div>
  )
}
