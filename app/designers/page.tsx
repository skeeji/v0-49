import Link from "next/link"

const DesignersPage = ({ user, userData, freeUserLimit }) => {
  return (
    <div>
      {(!user || userData?.role === "free") && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-sm" style={{ color: "#d4a574" }}>
          <p className="flex items-center font-serif">
            <span className="mr-2">ℹ️</span>
            <span>
              {!user ? "Connectez-vous" : "Vous utilisez un compte gratuit"}. Seuls 10% des designers sont accessibles (
              {freeUserLimit} designers).
              <Link href="/pricing" className="ml-1 underline font-medium">
                Passez à Premium
              </Link>{" "}
              pour accéder à toute la collection.
            </span>
          </p>
        </div>
      )}
      {/* rest of code here */}
    </div>
  )
}

export default DesignersPage
