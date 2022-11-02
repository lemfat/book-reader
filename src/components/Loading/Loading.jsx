import "./Loading.css"

export const Loading = ({ loading }) => {
  if (!loading) return

  return (
    <div className="loading">
      <span className="loader"></span>
    </div>
  )
}