import './TechStackPage.css'

const FIGMA_URL =
  'https://www.figma.com/design/g1oBZTvlYVe76CvwE7gOgq/cis-4500---final-project-design?node-id=0-1&t=EmOYUd4oyd5xyNsy-1'

function IconReact() {
  return (
    <svg className="tech-stack__svg" viewBox="-12 -12 24 24" aria-hidden>
      <circle cx="0" cy="0" r="2.05" fill="#61dafb" />
      <g stroke="#61dafb" fill="none" strokeWidth="1">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(-60)" />
      </g>
    </svg>
  )
}

function IconVite() {
  return (
    <svg className="tech-stack__svg" viewBox="0 0 24 24" aria-hidden>
      <path fill="url(#vite-g)" d="M18.4 2L4 4.5l2.5 13.6L12 22l5.5-4 2.5-15.5z" />
      <path fill="#747bff" d="M12 6.5l6 10.2-2 .7-4-6.8V6.5z" opacity=".65" />
      <defs>
        <linearGradient id="vite-g" x1="4" x2="19" y1="3" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#bd34fe" />
          <stop offset="1" stopColor="#41d1ff" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function IconNode() {
  return (
    <svg className="tech-stack__svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#339933"
        d="M12 2 4 6v12l8 4 8-4V6l-8-4zm0 2.2 5.8 3v7.6L12 19l-5.8-3V7.2L12 4.2z"
      />
      <path fill="#339933" d="M11 8.5h2v7h-2z" />
    </svg>
  )
}

function IconExpress() {
  return (
    <svg className="tech-stack__svg tech-stack__svg--express" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#f5f5f5" />
      <text x="12" y="15.5" textAnchor="middle" fill="#333" fontSize="9" fontWeight="700" fontFamily="system-ui,sans-serif">
        ex
      </text>
    </svg>
  )
}

function IconPostgres() {
  return (
    <svg className="tech-stack__svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#336791"
        d="M17.2 14.2c-.8 1.6-2.4 2.8-4 3 .6-2.4-.5-5.5-2.8-7.7 2.8 1 5 3 6.8 4.7zM9 17c-2.5-.8-4.7-3.7-5-6.5 3 .6 6 2 8 4.3L9 17zm-.8-9C6 9 4 11 3 13.5c3.3-.8 6.8-.7 9.8 1L8.2 8zm11.5 4.5c-.7-3.8-3.5-7.5-7.5-8.5 2 2.5 3 5.8 2.8 8.8 2.3-.8 4.3-1 4.7-.3z"
      />
      <path fill="#fff" d="M11 19c1 .2 2-.5 2.5-1.5S13 15 12 14s-2.5-.5-3 .5 1 3 2 4.5z" opacity=".35" />
    </svg>
  )
}

function IconFirebase() {
  return (
    <svg className="tech-stack__svg" viewBox="0 0 24 24" aria-hidden>
      <path fill="#ffa000" d="M4.5 17.5 12 3l2 6.5-9.5 8z" />
      <path fill="#f57c00" d="M12 3 19.5 17.5 14 15l-2-12z" />
      <path fill="#ffca28" d="m14 15 5.5 2.5L12 21l-7.5-3.5L14 15z" />
    </svg>
  )
}

function IconPython() {
  return (
    <svg className="tech-stack__svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#3776ab"
        d="M11.9 2C7 2 7 4 7 4v2h5V4H8.9S8 4 11.9 4s4 .9 4 3.9S15 12 12 12H8v4h4v2s0 2-4 2-4-1.9-4-4H4s0 4 5 4 7-2 7-6-.9-6-6.6-6z"
      />
      <path fill="#ffd43b" d="M12 12v4h4c2 0 4 1 4 4s-2 4-4 4v-2s2 0 2-2-1-2-3-2h-3v-6h4z" opacity=".95" />
      <circle cx="9" cy="7" r="1.2" fill="#fff" />
      <circle cx="15" cy="17" r="1.2" fill="#3776ab" />
    </svg>
  )
}

function IconRouter() {
  return (
    <svg className="tech-stack__svg" viewBox="0 0 24 24" aria-hidden>
      <path fill="none" stroke="#ca4245" strokeWidth="1.8" d="M4 8h16M4 16h16M9 4v16M15 4v16" />
      <circle cx="9" cy="8" r="2.2" fill="#fff" stroke="#ca4245" strokeWidth="1.4" />
      <circle cx="15" cy="16" r="2.2" fill="#fff" stroke="#ca4245" strokeWidth="1.4" />
    </svg>
  )
}

function IconFigma() {
  return (
    <svg className="tech-stack__svg" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="8" r="4.2" fill="#f24e1e" />
      <circle cx="8.5" cy="14.5" r="3.6" fill="#a259ff" />
      <circle cx="15.5" cy="14.5" r="3.6" fill="#1abcfe" />
      <circle cx="12" cy="18.8" r="2.6" fill="#0acf83" />
    </svg>
  )
}

function IconCursor() {
  return (
    <svg className="tech-stack__svg" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#14120b" />
      <path fill="#ececec" d="M7.5 5.5 17 12l-4 1 2 6.5L7.5 5.5z" />
    </svg>
  )
}

const STACK = [
  { title: 'React', Icon: IconReact },
  { title: 'Vite', Icon: IconVite },
  { title: 'React Router', Icon: IconRouter },
  { title: 'Node.js', Icon: IconNode },
  { title: 'Express', Icon: IconExpress },
  { title: 'PostgreSQL', Icon: IconPostgres },
  { title: 'Python', Icon: IconPython },
  { title: 'Firebase', Icon: IconFirebase },
  { title: 'Figma MCP', Icon: IconFigma },
  { title: 'Cursor', Icon: IconCursor },
]

export default function TechStackPage() {
  return (
    <div className="tech-stack">
      <h1 className="tech-stack__title">tech stack</h1>
      <p className="tech-stack__lead">
        React client; Express + Postgres backend. Design in Figma (+ Figma MCP); icons from Pinterest. Firebase for authentication and login setup.
        Cursor used for debugging.
      </p>
      <a className="tech-stack__figma-btn" href={FIGMA_URL} target="_blank" rel="noopener noreferrer">
        Figma
      </a>

      <section className="tech-stack__panel tech-stack__panel--icons" aria-label="Tools">
        <div className="tech-stack__grid">
          {STACK.map(({ title, Icon }) => (
            <figure key={title} className="tech-stack__card">
              <div className="tech-stack__icon-wrap">
                <Icon />
              </div>
              <figcaption className="tech-stack__caption">{title}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  )
}
