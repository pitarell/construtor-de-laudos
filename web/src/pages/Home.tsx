import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="container py-5">
      <div className="card shadow-sm">
        <div className="card-body">
          <h1 className="h5 mb-4">Construtor de Laudos</h1>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/reports/new')}
          >
            Novo Laudo
          </button>
        </div>
      </div>
    </div>
  )
}
