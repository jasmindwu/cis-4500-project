export default function ApiTimingLabel({ serverMs, clientMs, cached }) {
  if (serverMs == null && clientMs == null) return null
  return (
    <div className="api-timing-label">
      <span className="api-timing-label__dot" />
      {serverMs != null && <>query: {serverMs}ms</>}
      {serverMs != null && clientMs != null && <> · </>}
      {clientMs != null && <>round trip: {clientMs}ms</>}
      {cached && <span className="api-timing-label__cached"> · cached</span>}
    </div>
  )
}
