import { Navigate } from 'react-router-dom'

/** @deprecated Use /profile?tab=public */
const EditProfilePage = () => <Navigate to="/profile?tab=details" replace />

export default EditProfilePage
