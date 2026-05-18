//
// Bobcat mark: Mecha Bobcat.
//
//   Design rules I'm locking in this time so the mark can't fail:
//
//   1. SOLID FILLS ONLY for the brand-critical elements (eyes). Gradients
//      that fade to near-background at the edges turn into a "single dot"
//      at favicon size. The eyes here are flat cyan circles, big enough
//      to dominate the mark even at 16x16.
//
//   2. THE FACE IS WIDE. A balloon-shaped silhouette reads as "alien".
//      A pear-shaped silhouette with a strong jaw reads as "cat".
//      Wider at the cheeks than at the chin.
//
//   3. EARS HAVE TUFTS. Real bobcats have tufted ears. Adding a tiny
//      secondary point at the ear tip makes the silhouette obviously
//      feline (and obviously bobcat, not generic cat).
//
//   4. ONE ROBOT TELL. A single status pip between the ears does all
//      the "robot" work. No faceplate seams, no visor, no whisker dots,
//      no cheek bolts. Quiet around a strong centre.
export default function Logo({ size = 32, mono = false, title = 'Bobcat' }) {
  const id = `bc-${Math.random().toString(36).slice(2, 8)}`;

  // Silhouette: pear-shaped face with two angular tufted ears.
  // Plotted in a 64x64 viewBox so it composes with everything else.
  const catPath = `
    M 6 32
    L 14 4
    L 17 1
    L 19 5
    L 24 26
    C 27 28, 37 28, 40 26
    L 45 5
    L 47 1
    L 50 4
    L 58 32
    C 60 50, 50 60, 32 60
    C 14 60, 4 50, 6 32 Z
  `;

  if (mono) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"
           role="img" aria-label={title}>
        <title>{title}</title>
        <path d={catPath} fill="currentColor" />
        {
        // In mono mode the eyes are punched-out with the background colour.
        // Caller is responsible for painting the background through.
}
        <circle cx="23" cy="36" r="6" fill="#000" />
        <circle cx="41" cy="36" r="6" fill="#000" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"
         role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        {
        // Eye fill: brightest in the centre, but the FALLOFF IS SHALLOW so
        // even the outer ring reads as bright cyan against the dark body.
        // Last stop sits at #2ED8F0 (the brand accent), not at a darker
        // color, so the edges never vanish into the silhouette.
}
        <radialGradient id={`${id}-eye`} cx="0.4" cy="0.4" r="0.6">
          <stop offset="0"   stopColor="#E8FBFF" />
          <stop offset="0.4" stopColor="#5EF0FF" />
          <stop offset="1"   stopColor="#2ED8F0" />
        </radialGradient>

        {/* Halo behind each eye - subtle outer bloom. */}
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0"   stopColor="#2ED8F0" stopOpacity="0.55" />
          <stop offset="0.7" stopColor="#2ED8F0" stopOpacity="0.10" />
          <stop offset="1"   stopColor="#2ED8F0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {
      // Silhouette. Solid slate fill, NOT a gradient - keeps the shape
      // unambiguous against any backdrop. Thin blue outline gives the
      // mark a little edge-glow without dominating.
}
      <path
        d={catPath}
        fill="#10131F"
        stroke="#3D6FC4"
        strokeWidth="1.4"
        strokeOpacity="0.95"
        strokeLinejoin="round"
      />

      {
      // Status pip between the ears - the one "robot" tell. Sits just
      // inside the silhouette so it reads as a sensor on the forehead.
}
      <circle cx="32" cy="14" r="1.7" fill="#2ED8F0" />
      <circle cx="32" cy="14" r="3.6" fill="#2ED8F0" opacity="0.30" />

      {/* Eye halos */}
      <circle cx="23" cy="36" r="11" fill={`url(#${id}-halo)`} />
      <circle cx="41" cy="36" r="11" fill={`url(#${id}-halo)`} />

      {/* The eyes. Big, bright, round, unmistakable at any size. */}
      <circle cx="23" cy="36" r="6.2" fill={`url(#${id}-eye)`} />
      <circle cx="41" cy="36" r="6.2" fill={`url(#${id}-eye)`} />

      {
      // Inner specular highlights - tiny offset white discs that read as
      // shine on a glass lens. Two per eye: one big highlight, one tiny
      // catchlight, mirrors the way real eyes look in photos.
}
      <circle cx="21" cy="34" r="1.6" fill="#FFFFFF" opacity="0.90" />
      <circle cx="39" cy="34" r="1.6" fill="#FFFFFF" opacity="0.90" />
      <circle cx="25" cy="38" r="0.7" fill="#FFFFFF" opacity="0.65" />
      <circle cx="43" cy="38" r="0.7" fill="#FFFFFF" opacity="0.65" />

      {
      // Tiny nose (subtle, low contrast). Removes the "blank gap" between
      // the eyes and the chin without competing with the eyes for focus.
}
      <path
        d="M 30 49 L 32 51.5 L 34 49 Z"
        fill="#3D6FC4"
        opacity="0.55"
      />
    </svg>
  );
}

//
// Wordmark lockup: the mecha-bobcat on a tinted tile + the name.
// Used in HomePage header and footer.
export function LogoLockup({ size = 36, subtitle = null }) {
  const tile = size + 10;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
      <div style={{
        width: tile, height: tile, borderRadius: 12,
        background: 'linear-gradient(135deg, #060812 0%, #131727 100%)',
        border: '1px solid rgba(46,216,240,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 22px rgba(0,0,0,0.42), 0 0 24px rgba(46,216,240,0.14) inset',
      }}>
        <Logo size={Math.round(size * 0.82)} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontSize: 17, fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '-0.03em',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        }}>
          Bobcat
        </span>
        {subtitle && (
          <span style={{
            fontSize: 9.5, marginTop: 4,
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            fontWeight: 500,
            textTransform: 'uppercase',
          }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
