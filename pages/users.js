import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Users() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [modal, setModal] = useState({ show: false, type: '', message: '', onConfirm: null })
  const [deleteLoading, setDeleteLoading] = useState(null)

  useEffect(() => {
    // Check admin status
    const adminStatus = localStorage.getItem('is_admin') === '1'
    setIsAdmin(adminStatus)
    
    if (!adminStatus) {
      setLoading(false)
      return
    }

    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      // Initialize Supabase client
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseClient = createClient(
        "https://xzbwfoacsnrmgjmildcr.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Yndmb2Fjc25ybWdqbWlsZGNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTkxNzUsImV4cCI6MjA3Mzc3NTE3NX0.c10rEbuzQIkVvuJEecEltokgaj6AqjyP5IoFVffjizc"
      )

      const { data, error } = await supabaseClient
        .from('instagram_accounts')
        .select('*')
        .order('id', { ascending: false })

      if (error) {
        console.error('Error loading users:', error)
        setUsers([])
        setFilteredUsers([])
      } else {
        setUsers(data || [])
        setFilteredUsers(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      setUsers([])
      setFilteredUsers([])
    } finally {
      setLoading(false)
    }
  }

  // Search filter
  useEffect(() => {
    if (!searchQuery) {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.note && user.note.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredUsers(filtered)
    }
  }, [searchQuery, users])

  const showModal = (type, message, onConfirm = null) => {
    setModal({ show: true, type, message, onConfirm })
  }

  const hideModal = () => {
    setModal({ show: false, type: '', message: '', onConfirm: null })
  }

  const deleteUser = async (userId, username) => {
    showModal('confirm', `Haqiqatan @${username} ni o'chirmoqchimisiz? Bu hisob va unga tegishli barcha postlar o'chadi.`, async () => {
      setDeleteLoading(userId)
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseClient = createClient(
          "https://xzbwfoacsnrmgjmildcr.supabase.co",
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Yndmb2Fjc25ybWdqbWlsZGNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTkxNzUsImV4cCI6MjA3Mzc3NTE3NX0.c10rEbuzQIkVvuJEecEltokgaj6AqjyP5IoFVffjizc"
        )

        // First delete all posts for this account
        await supabaseClient
          .from('posts')
          .delete()
          .eq('account_id', userId)

        // Then delete the account
        const { error } = await supabaseClient
          .from('instagram_accounts')
          .delete()
          .eq('id', userId)

        if (error) {
          showModal('error', "O'chirishda xato: " + error.message)
        } else {
          showModal('success', "Muvaffaqiyatli o'chirildi")
          loadUsers() // Refresh the list
        }
      } catch (error) {
        console.error('Delete error:', error)
        showModal('error', "O'chirishda xato yuz berdi")
      } finally {
        setDeleteLoading(null)
      }
    })
  }

  const goBack = () => {
    router.push('/')
  }

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Users Management — Secret Admin</title>
      </Head>

      <style jsx global>{`
        :root{
          --bg:#071026;
          --card:#0b1220;
          --accent:#7c3aed;
          --muted:#9aa4b2;
          --glass: rgba(255,255,255,0.03);
        }
        *{box-sizing:border-box}
        html,body{height:100%}
        body{
          margin:0;
          font-family: "Space Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace;
          background: linear-gradient(180deg,#030617 0%, #071026 100%);
          color:#e6eef6;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:18px;
          -webkit-tap-highlight-color: transparent;
            outline: none;
        }

        .wrap{
          width:100%;
          max-width:920px;
          background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00));
          border-radius:14px;
          padding:18px;
          box-shadow: 0 10px 40px rgba(2,6,23,0.6);
          border:1px solid rgba(255,255,255,0.03);
          display:grid;
          gap:14px;
        }

        .top{
          display:flex;
          gap:10px;
          align-items:center;
          justify-content:space-between;
          flex-wrap:wrap;
        }

        button.btn{
          color:white;
          background-color:#030617;
          padding:14px 14px;
          border-radius:10px;
          border:none;
          cursor:pointer;
          font-weight:700;
          transition: background-color 0.2s;
        }
        button.btn:hover{
          background-color:#1a1f3a;
        }

        .card{
          background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00));
          padding:14px;
          border-radius:12px;
          border:1px solid rgba(255,255,255,0.02);
          box-shadow: 0 6px 18px rgba(2,6,23,0.35);
        }

        .list{display:flex;flex-direction:column;gap:10px;max-height:420px;overflow:auto;padding-right:6px}
        .item{
          display:flex;align-items:center;justify-content:space-between;gap:12px;
          padding:10px;border-radius:8px;background:rgba(255,255,255,0.01);
          border:1px solid rgba(255,255,255,0.02);
        }
        .username{font-weight:700}
        .meta{color:var(--muted);font-size:13px}

        .admin-pill{background:rgba(124,58,237,0.14);color:var(--accent);padding:6px 8px;border-radius:8px;font-weight:700;font-size:13px}

        .delete-btn { background: #e85555; padding: 8px 12px; font-size: 13px; }
        .delete-btn:hover { background: #d14545; }

        .loading { text-align: center; padding: 20px; }
        
        .search-box {
          display: flex;
          gap: 10px;
          align-items: center;
          width: 100%;
          margin-bottom: 10px;
        }
        
        input[type="text"] {
          background: var(--glass);
          border: 1px solid rgba(255,255,255,0.03);
          padding: 14px 16px;
          border-radius: 10px;
          color: inherit;
          outline: none;
          font-family: inherit;
          font-size: 16px;
          width: 100%;
          letter-spacing: 0.6px;
        }
        
        input[type="text"]:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }
        
        .modal {
          background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(2,6,23,0.8);
          animation: slideUp 0.3s ease;
        }
        
        .modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .modal-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        
        .modal-icon.success { background: #10b981; color: white; }
        .modal-icon.error { background: #e85555; color: white; }
        .modal-icon.confirm { background: #f59e0b; color: white; }
        
        .modal-title {
          font-weight: 700;
          font-size: 16px;
        }
        
        .modal-message {
          color: var(--muted);
          line-height: 1.5;
          margin-bottom: 20px;
        }
        
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        
        .modal-btn {
          padding: 10px 16px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .modal-btn.primary {
          background: var(--accent);
          color: white;
        }
        
        .modal-btn.primary:hover {
          background: #6d28d9;
        }
        
        .modal-btn.secondary {
          background: rgba(255,255,255,0.05);
          color: var(--muted);
          border: 1px solid rgba(255,255,255,0.1);
        }
        
        .modal-btn.secondary:hover {
          background: rgba(255,255,255,0.1);
          color: #e6eef6;
        }
        
        .modal-btn.danger {
          background: #e85555;
          color: white;
        }
        
        .modal-btn.danger:hover {
          background: #d14545;
        }
        
        .delete-btn-loading {
          opacity: 0.6;
          pointer-events: none;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="wrap">
        <div className="top">
          <strong>Users Management</strong>
          {isAdmin && <div className="admin-pill">ADMIN</div>}
          <button className="btn" onClick={goBack}>
            <i className="fa-solid fa-arrow-left"></i> Orqaga
          </button>
        </div>

        <div className="card">
          <div className="list">
            {!isAdmin ? (
              <div className="meta">Admin emassiz.</div>
            ) : loading ? (
              <div className="loading">
                <i className="fa-solid fa-spinner fa-spin"></i> Yuklanmoqda...
              </div>
            ) : filteredUsers.length === 0 && searchQuery ? (
              <div className="meta">"{searchQuery}" uchun natija topilmadi.</div>
            ) : filteredUsers.length === 0 ? (
              <div className="meta">Hech qanday user yo'q.</div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.id} className="item">
                  <div>
                    <div className="username">@{user.username}</div>
                    <div className="meta">
                      {user.note || 'Izoh yo\'q'}
                    </div>
                  </div>
                  <button 
                    className={`btn delete-btn ${deleteLoading === user.id ? 'delete-btn-loading' : ''}`}
                    onClick={() => deleteUser(user.id, user.username)}
                    disabled={deleteLoading === user.id}
                  >
                    {deleteLoading === user.id ? (
                      <><i className="fa-solid fa-spinner fa-spin"></i> O'chirilmoqda...</>
                    ) : (
                      <><i className="fa-solid fa-trash"></i> O'chirish</>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Custom Modal */}
        {modal.show && (
          <div className="modal-overlay" onClick={hideModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className={`modal-icon ${modal.type}`}>
                  {modal.type === 'success' && <i className="fa-solid fa-check"></i>}
                  {modal.type === 'error' && <i className="fa-solid fa-times"></i>}
                  {modal.type === 'confirm' && <i className="fa-solid fa-exclamation"></i>}
                </div>
                <div className="modal-title">
                  {modal.type === 'success' && 'Muvaffaqiyat'}
                  {modal.type === 'error' && 'Xato'}
                  {modal.type === 'confirm' && 'Tasdiqlash'}
                </div>
              </div>
              <div className="modal-message">
                {modal.message}
              </div>
              <div className="modal-actions">
                {modal.type === 'confirm' ? (
                  <>
                    <button className="modal-btn secondary" onClick={hideModal}>
                      Bekor qilish
                    </button>
                    <button className="modal-btn danger" onClick={() => {
                      modal.onConfirm()
                      hideModal()
                    }}>
                      O'chirish
                    </button>
                  </>
                ) : (
                  <button className="modal-btn primary" onClick={hideModal}>
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {isAdmin && users.length > 0 && (
          <div className="card">
            <div className="meta" style={{textAlign: 'center'}}>
              Jami: {users.length} ta user
            </div>
          </div>
        )}
      </div>
    </>
  )
}