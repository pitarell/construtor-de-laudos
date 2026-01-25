import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  return (
    <div className="container py-5">
      <div className="card shadow-sm">
        <div className="card-body">
          <h1 className="h5 mb-3">Login</h1>

          <div className="mb-3">
            <label className="form-label">Usuário</label>
            <input className="form-control" />
          </div>

          <div className="mb-3">
            <label className="form-label">Senha</label>
            <input className="form-control" type="password" />
          </div>

          <button className="btn btn-primary w-100" onClick={() => navigate('/home')}>
            Entrar
          </button>
        </div>
      </div>
    </div>
  )
}
