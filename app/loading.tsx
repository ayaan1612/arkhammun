export default function Loading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#0a0608",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99990,
      }}
      aria-label="Loading page content"
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          border: "2px solid rgba(227, 38, 46, 0.2)",
          borderTopColor: "#e3262e",
          boxShadow: "0 0 20px rgba(227, 38, 46, 0.4)",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
