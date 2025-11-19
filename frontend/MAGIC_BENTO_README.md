# Magic Bento Integration

## Overview
Magic Bento has been integrated into the Home IoT System frontend to provide interactive, visually appealing card effects with particles, spotlight effects, and smooth animations.

## Features Implemented

### 1. **Particle Effects (Stars)**
- Animated particles appear on hover
- Configurable particle count (8-12 particles per card)
- Smooth fade-in/fade-out animations using GSAP

### 2. **Border Glow Effect**
- Dynamic border glow follows mouse movement
- Intensity varies based on mouse proximity
- Cyan/blue glow color (`56, 189, 248` RGB) matching the app theme

### 3. **Spotlight Effect**
- Global spotlight follows mouse across the entire grid
- Illuminates cards as the mouse passes over them
- Smooth transitions and fade effects

### 4. **3D Tilt Effect**
- Cards tilt based on mouse position
- Creates depth and interactive feel
- Disabled on mobile for better performance

### 5. **Magnetic Effect**
- Cards subtly move toward the mouse cursor
- Enhanced interactivity
- Disabled on mobile devices

### 6. **Click/Ripple Effect**
- Ripple animation on card click
- Visual feedback for user interaction

## Components

### `MagicBentoCard`
Wraps any card content with magic effects.

**Props:**
- `enableStars` (boolean, default: true) - Enable particle effects
- `enableBorderGlow` (boolean, default: true) - Enable border glow on hover
- `enableTilt` (boolean, default: false) - Enable 3D tilt effect
- `enableMagnetism` (boolean, default: true) - Enable magnetic pull effect
- `clickEffect` (boolean, default: true) - Enable click ripple effect
- `particleCount` (number, default: 12) - Number of particles
- `glowColor` (string, default: "132, 0, 255") - RGB color for effects
- `textAutoHide` (boolean, default: false) - Auto-hide overflow text
- `className` (string) - Additional CSS classes
- `style` (object) - Inline styles

### `MagicBentoGrid`
Wrapper component that enables the global spotlight effect across all cards.

**Props:**
- `enableSpotlight` (boolean, default: true) - Enable global spotlight
- `spotlightRadius` (number, default: 300) - Spotlight radius in pixels
- `glowColor` (string, default: "132, 0, 255") - RGB color for spotlight

## Implementation in App.jsx

### Metric Cards
```jsx
<MagicBentoCard 
  enableStars={true}
  enableBorderGlow={true}
  enableTilt={true}
  enableMagnetism={true}
  clickEffect={true}
  particleCount={8}
  glowColor="56, 189, 248"
  className="card metric-card"
>
  {/* Card content */}
</MagicBentoCard>
```

### Main Control Cards
```jsx
<MagicBentoCard 
  enableStars={true}
  enableBorderGlow={true}
  enableTilt={true}
  enableMagnetism={true}
  clickEffect={true}
  particleCount={10}
  glowColor="56, 189, 248"
  className="card control-card"
>
  {/* Control card content */}
</MagicBentoCard>
```

### Schedule List Card
```jsx
<MagicBentoCard 
  enableStars={true}
  enableBorderGlow={true}
  enableTilt={true}
  enableMagnetism={true}
  clickEffect={true}
  particleCount={12}
  glowColor="56, 189, 248"
  className="card schedule-list"
>
  {/* Schedule list content */}
</MagicBentoCard>
```

## Performance Optimizations

1. **Mobile Detection**
   - Automatically disables animations on mobile devices (< 768px)
   - Reduces battery consumption and improves performance

2. **Particle Management**
   - Particles are only created and animated when hovering
   - Properly cleaned up when mouse leaves
   - Prevents memory leaks

3. **GSAP Animations**
   - Hardware-accelerated animations
   - Smooth 60fps performance
   - Efficient cleanup on unmount

## Color Theme
- Primary glow color: `rgb(56, 189, 248)` (Cyan/Sky Blue)
- Matches the app's existing color scheme
- Creates cohesive visual design

## Dependencies
- `gsap`: ^3.13.0 (already installed)
- `react`: ^18.2.0 (already installed)

## Files Added/Modified

### New Files:
1. `frontend/src/components/MagicBento.jsx` - Main component
2. `frontend/src/components/MagicBento.css` - Styles
3. `frontend/MAGIC_BENTO_README.md` - This file

### Modified Files:
1. `frontend/src/App.jsx` - Integrated MagicBentoCard and MagicBentoGrid

## Usage Tips

1. **Adjust Particle Count**
   - Small cards: 6-8 particles
   - Medium cards: 8-10 particles
   - Large cards: 10-12 particles

2. **Disable Heavy Effects on Mobile**
   - Tilt and magnetism are auto-disabled on mobile
   - Consider disabling particles for very old devices

3. **Custom Colors**
   - Pass RGB values as string: `"255, 0, 128"`
   - Match your app's color scheme

4. **Combining with Existing Styles**
   - Magic Bento preserves all existing card classes
   - Just wrap existing cards with `<MagicBentoCard>`

## Browser Support
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Simplified animations (no tilt/magnetism)

## Future Enhancements
- Add theme variants (purple, green, red)
- Custom particle shapes (stars, circles, squares)
- Animation speed controls
- Disable individual effects per card
