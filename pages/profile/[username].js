import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Profile() {
  const router = useRouter()
  const { username } = router.query
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // all, photos, videos
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [subscribers, setSubscribers] = useState([])
  const [subscribersCount, setSubscribersCount] = useState(0)

  useEffect(() => {
    if (username) {
      loadProfile()
    }
  }, [username])

  const loadProfile = async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseClient = createClient(
        "https://xzbwfoacsnrmgjmildcr.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Yndmb2Fjc25ybWdqbWlsZGNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTkxNzUsImV4cCI6MjA3Mzc3NTE3NX0.c10rEbuzQIkVvuJEecEltokgaj6AqjyP5IoFVffjizc"
      )

      // Load user data
      const { data: userData, error: userError } = await supabaseClient
        .from('instagram_accounts')
        .select('*')
        .eq('username', username)
        .single()

      if (userError || !userData) {
        setUser(null)
        setLoading(false)
        return
      }

      setUser(userData)

      // Load posts
      const { data: postsData, error: postsError } = await supabaseClient
        .from('posts')
        .select('*')
        .eq('account_id', userData.id)
        .order('id', { ascending: false })

      if (!postsError) {
        setPosts(postsData || [])
      }

      // Load subscribers
      await loadSubscribers(supabaseClient, userData.id)
      
      // Check if current visitor is subscribed
      const visitorId = localStorage.getItem('visitor_id') || generateVisitorId()
      const { data: subscriptionData } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('account_id', userData.id)
        .eq('subscriber_id', visitorId)
        .single()
      
      setIsSubscribed(!!subscriptionData)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    router.back()
  }

  const openPostModal = (post) => {
    setSelectedPost(post)
  }

  const closePostModal = () => {
    setSelectedPost(null)
  }

  const generateVisitorId = () => {
    const id = 'visitor_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('visitor_id', id)
    return id
  }

  const loadSubscribers = async (supabaseClient, accountId) => {
    const { data: subsData, error } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('account_id', accountId)
    
    if (!error && subsData) {
      setSubscribers(subsData)
      setSubscribersCount(subsData.length)
    }
  }

  const toggleSubscribe = async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseClient = createClient(
        "https://xzbwfoacsnrmgjmildcr.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Yndmb2Fjc25ybWdqbWlsZGNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTkxNzUsImV4cCI6MjA3Mzc3NTE3NX0.c10rEbuzQIkVvuJEecEltokgaj6AqjyP5IoFVffjizc"
      )

      const visitorId = localStorage.getItem('visitor_id') || generateVisitorId()

      if (isSubscribed) {
        // Unsubscribe
        const { error } = await supabaseClient
          .from('subscriptions')
          .delete()
          .eq('account_id', user.id)
          .eq('subscriber_id', visitorId)
        
        if (!error) {
          setIsSubscribed(false)
          setSubscribersCount(prev => prev - 1)
        }
      } else {
        // Subscribe
        const { error } = await supabaseClient
          .from('subscriptions')
          .insert({
            account_id: user.id,
            subscriber_id: visitorId,
            subscribed_at: new Date().toISOString()
          })
        
        if (!error) {
          setIsSubscribed(true)
          setSubscribersCount(prev => prev + 1)
        }
      }
      
      // Reload subscribers
      await loadSubscribers(supabaseClient, user.id)
    } catch (error) {
      console.error('Subscribe error:', error)
    }
  }

  const shareProfile = () => {
    setShowShareModal(true)
  }

  const closeShareModal = () => {
    setShowShareModal(false)
  }

  const copyProfileLink = () => {
    const profileUrl = window.location.href
    navigator.clipboard.writeText(profileUrl)
    alert('Link nusxalandi!')
  }

  const getFilteredPosts = () => {
    switch (activeTab) {
      case 'photos':
        return posts.filter(post => post.media_type === 'image' || (!post.media_type && post.media_url))
      case 'videos':
        return posts.filter(post => post.media_type === 'video')
      default:
        return posts
    }
  }

  const photosCount = posts.filter(post => post.media_type === 'image' || (!post.media_type && post.media_url)).length
  const videosCount = posts.filter(post => post.media_type === 'video').length

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg,#030617 0%, #071026 100%)',
        color: '#e6eef6',
        fontFamily: '"Space Mono", monospace'
      }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '16px' }}></i>
          <div>Yuklanmoqda...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg,#030617 0%, #071026 100%)',
        color: '#e6eef6',
        fontFamily: '"Space Mono", monospace'
      }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fa-solid fa-user-slash" style={{ fontSize: '48px', marginBottom: '16px', color: '#9aa4b2' }}></i>
          <h2>User topilmadi</h2>
          <button 
            onClick={goBack}
            style={{
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            Orqaga
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="icon" href="/assets/favicon.png" type="image/png" />
        <title> {user.username} </title>
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
        html,body{height:100%;margin:0;padding:0}
        body{
          font-family: "Space Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace;
          background: linear-gradient(180deg,#030617 0%, #071026 100%);
          color:#e6eef6;
          min-height:100vh;
          -webkit-tap-highlight-color: transparent;
            outline: none;
        }

        .profile-container{
          max-width: 935px;
          margin: 0 auto;
          padding: 20px;
        }

        .profile-header{
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.00));
          padding: 30px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .profile-pic-large{
          width: 150px;
          height: 150px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
        }

        .profile-info h1{
          font-size: 28px;
          font-weight: 300;
          margin: 0 0 1px 0;
        }

        .profile-stats{
          display: flex;
          gap: 40px;
          margin-bottom: 20px;
        }

        .stats{
        display:flex;
        text-align:center;
        margin: 0 auto;
        margin-bottom:10px;
        align-items:center;
        gap:10px;
        font-size:10px;
        cursor:pointer;
        }

        .stat{
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .stat:hover{
          transform: translateY(-2px);
        }
        
        .stats-number{
        font-size:15px;
        }

        .stat-number{
          font-size: 18px;
          font-weight: 600;
        }

        .stat-label{
          color: var(--muted);
          font-size: 14px;
        }

        .profile-note{
          color: var(--muted);
          line-height: 1.4;
          max-width: 300px;
          margin-bottom: 20px;
        }

        .profile-actions{
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom:10px;
          padding:0px 0px 10px 0px;
          border-bottom:2px solid;
        }

        .subscribe-btn{
          background: white;
          color: black;
          font-family:monospace;
          border: none;
          padding: 8px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .subscribe-btn:hover{
          background: silver;
          transform: translateY(-1px);
        }

        .subscribe-btn.subscribed{
          background: rgba(255,255,255,0.1);
          color: var(--muted);
        }

        .share-btn{
          background: transparent;
          border: 1px solid rgba(255,255,255,0.2);
          color: var(--muted);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .share-btn:hover{
          background: rgba(255,255,255,0.05);
          color: white;
        }

        .back-btn{
          position: fixed;
          top: 20px;
          left: 20px;
          background: rgba(0,0,0,0.8);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 8px 10px;
          border-radius: 50%;
          cursor: pointer;
          z-index: 100;
          backdrop-filter: blur(10px);
          transition: all 0.2s;
        }

        .back-btn:hover{
          background: rgba(0,0,0,0.9);
          transform: scale(1.05);
        }

        .tabs-container{
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 20px;
          margin-top: 20px;
        }

        .tabs{
          display: flex;
          justify-content: center;
          gap: 60px;
          margin-bottom: 20px;
        }

        .tab{
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--muted);
          text-transform: uppercase;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1px;
          cursor: pointer;
          padding: 12px 0;
          border-top: 1px solid transparent;
          transition: all 0.2s;
        }

        .tab:hover{
          color: white;
        }

        .tab.active{
          color: white;
          border-top-color: white;
        }

        .share-modal{
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }
        
        .share-content{
          background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          animation: slideUp 0.3s ease;
        }

        .share-header{
          text-align: center;
          margin-bottom: 20px;
          font-weight: 600;
        }

        .share-options{
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .share-option{
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .share-option:hover{
          background: rgba(255,255,255,0.05);
        }

        .share-icon{
          width: 24px;
          text-align: center;
        }

        .posts-grid{
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(293px, 1fr));
          gap: 3px;
          margin-top: 20px;
        }

        .post-item{
          aspect-ratio: 1;
          position: relative;
          cursor: pointer;
          overflow: hidden;
          border-radius: 4px;
          background: rgba(255,255,255,0.02);
          transition: transform 0.2s;
        }

        .post-item:hover{
          transform: scale(1.02);
        }

        .post-item img, .post-item video{
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .post-item-overlay{
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .post-item:hover .post-item-overlay{
          opacity: 1;
        }

        .video-indicator{
          position: absolute;
          top: 8px;
          right: 8px;
          color: white;
          font-size: 16px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }

        .modal-overlay{
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        .post-modal{
          background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          overflow: hidden;
          animation: slideUp 0.3s ease;
        }

        .post-media-container{
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: black;
          max-width: 600px;
        }

        .post-media-modal{
          max-width: 100%;
          max-height: 90vh;
          object-fit: contain;
        }

        .post-details{
          width: 335px;
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .post-header{
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .post-content{
          color: var(--muted);
          line-height: 1.4;
          margin-top: 8px;
        }

        .close-modal{
          position: absolute;
          top: 18px;
          right: 20px;
          background: rgba(0,0,0,0.8);
          border: none;
          color: white;
          padding: 5px 8px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          z-index: 1001;
        }

        .no-posts{
          text-align: center;
          padding: 60px 20px;
          color: var(--muted);
        }

        .no-posts-icon{
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @media (max-width: 768px) {

        body{
        background:black;
        }
          .profile-header{
            flex-direction: column;
            text-align: center;
            padding: 20px;
          }
          
          .profile-pic-large{
            width: 120px;
            height: 120px;
          }
          
          .profile-stats{
            justify-content: center;
            gap: 60px;
          }

          .stats{
        justify-content:center;
          }

          .post-header{
          display:none;
          }
         
          .post-content{
          margin-top:0px;
          }
          
          .tabs{
            gap: 25px;
          }
          
          .posts-grid{
            grid-template-columns: repeat(3, 1fr);
            gap: 2px;
          }
          
          .post-modal{
            flex-direction: column;
            max-height: 95vh;
          }
          
          .post-details{
            width: 100%;
          }
          
          .profile-container{
            padding: 10px;
            background:black;
          }
        }
      `}</style>

      <button className="back-btn" onClick={goBack}>
        <i className="fa-solid fa-arrow-left"></i>
      </button>

      <div className="profile-container">
        <div className="profile-header">
          <div>
            {user.profile_pic_url ? (
              <img 
                src={user.profile_pic_url} 
                alt={user.username}
                className="profile-pic-large"
              />
            ) : (
              <div className="profile-pic-large" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                color: '#9aa4b2'
              }}>
                <i className="fa-solid fa-user"></i>
              </div>
            )}
          </div>
          <div className="profile-info">
            <h1>@{user.username}</h1>
            <div className="stats">
                <div className="stats-number">{subscribersCount}</div> <div className="stat-label">subscribers</div>
              </div>



              <div className="profile-actions">
              <button 
                className={`subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
                onClick={toggleSubscribe}
              >
                {isSubscribed ? (
                  <>
                    <i className="fa-solid fa-check"></i> Obuna
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-plus"></i> Obuna bo'lish
                  </>
                )}
              </button>
              <button className="share-btn" onClick={shareProfile}>
                <i className="fa-solid fa-share"></i> Ulashish
              </button>
            </div>



            <div className="profile-stats">
              <div className="stat" onClick={() => setActiveTab('all')}>
                <div className="stat-number">{posts.length}</div>
                <div className="stat-label">post</div>
              </div>
             
              <div className="stat" onClick={() => setActiveTab('photos')}>
                <div className="stat-number">{photosCount}</div>
                <div className="stat-label">rasm</div>
              </div>
              <div className="stat" onClick={() => setActiveTab('videos')}>
                <div className="stat-number">{videosCount}</div>
                <div className="stat-label">video</div>
              </div>
            </div>
            
            {user.note && (
              <div className="profile-note">{user.note}</div>
            )}

          </div>
        </div>

        <div className="tabs-container">
          <div className="tabs">
            <div 
              className={`tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <i className="fa-solid fa-th"></i> Barchasi
            </div>
            <div 
              className={`tab ${activeTab === 'photos' ? 'active' : ''}`}
              onClick={() => setActiveTab('photos')}
            >
              <i className="fa-regular fa-image"></i> Rasmlar
            </div>
            <div 
              className={`tab ${activeTab === 'videos' ? 'active' : ''}`}
              onClick={() => setActiveTab('videos')}
            >
              <i className="fa-solid fa-play"></i> Videolar
            </div>
          </div>

          {getFilteredPosts().length === 0 ? (
            <div className="no-posts">
              <div className="no-posts-icon">
                {activeTab === 'photos' ? (
                  <i className="fa-regular fa-image"></i>
                ) : activeTab === 'videos' ? (
                  <i className="fa-solid fa-play"></i>
                ) : (
                  <i className="fa-regular fa-image"></i>
                )}
              </div>
              <h3>
                {activeTab === 'photos' ? 'Hech qanday rasm yo\'q' :
                 activeTab === 'videos' ? 'Hech qanday video yo\'q' :
                 'Hech qanday post yo\'q'}
              </h3>
              <p>
                {activeTab === 'photos' ? 'Bu user hali hech qanday rasm post qilmagan' :
                 activeTab === 'videos' ? 'Bu user hali hech qanday video post qilmagan' :
                 'Bu user hali hech narsa post qilmagan'}
              </p>
            </div>
          ) : (
            <div className="posts-grid">
              {getFilteredPosts().map(post => (
                <div 
                  key={post.id} 
                  className="post-item"
                  onClick={() => openPostModal(post)}
                >
                  {post.media_url && (
                    <>
                      {post.media_type === 'video' ? (
                        <>
                          <video>
                            <source src={post.media_url} type="video/mp4" />
                          </video>
                          <div className="video-indicator">
                            <i className="fa-solid fa-play"></i>
                          </div>
                        </>
                      ) : (
                        <img src={post.media_url} alt="Post" />
                      )}
                    </>
                  )}
                  <div className="post-item-overlay">
                    <i className="fa-regular fa-heart" style={{ color: 'white', fontSize: '24px' }}></i>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Post Modal */}
        {selectedPost && (
          <div className="modal-overlay" onClick={closePostModal}>
            <div className="post-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-modal" onClick={closePostModal}>
                <i className="fa-solid fa-times"></i>
              </button>
              
              <div className="post-media-container">
                {selectedPost.media_url && (
                  selectedPost.media_type === 'video' ? (
                    <video className="post-media-modal" controls>
                      <source src={selectedPost.media_url} type="video/mp4" />
                    </video>
                  ) : (
                    <img 
                      src={selectedPost.media_url} 
                      alt="Post" 
                      className="post-media-modal"
                    />
                  )
                )}
              </div>
              
              <div className="post-details">
                <div className="post-header">
                  {user.profile_pic_url ? (
                    <img 
                      src={user.profile_pic_url} 
                      alt={user.username}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}>
                      <i className="fa-solid fa-user"></i>
                    </div>
                  )}
                  <strong>@{user.username}</strong>
                </div>
                
                {selectedPost.content && (
                  <div className="post-content">
                    <strong>@{user.username}</strong> {selectedPost.content}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="share-modal" onClick={closeShareModal}>
            <div className="share-content" onClick={(e) => e.stopPropagation()}>
              <div className="share-header">
                <i className="fa-solid fa-share"></i> Profilni ulashish
              </div>
              <div className="share-options">
                <div className="share-option" onClick={copyProfileLink}>
                  <div className="share-icon">
                    <i className="fa-solid fa-link"></i>
                  </div>
                  <div>
                    <div style={{fontWeight: '600'}}>Link nusxalash</div>
                    <div style={{color: 'var(--muted)', fontSize: '13px'}}>
                      Profil linkini clipboard ga nusxalash
                    </div>
                  </div>
                </div>
                
                <div 
                  className="share-option" 
                  onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`@${user.username} profilini ko'ring`)}`)}
                >
                  <div className="share-icon" style={{color: '#0088cc'}}>
                    <i className="fa-brands fa-telegram"></i>
                  </div>
                  <div>
                    <div style={{fontWeight: '600'}}>Telegram</div>
                    <div style={{color: 'var(--muted)', fontSize: '13px'}}>
                      Telegram orqali ulashish
                    </div>
                  </div>
                </div>
                
                <div 
                  className="share-option" 
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`@${user.username} profilini ko'ring: ${window.location.href}`)}`)}
                >
                  <div className="share-icon" style={{color: '#25d366'}}>
                    <i className="fa-brands fa-whatsapp"></i>
                  </div>
                  <div>
                    <div style={{fontWeight: '600'}}>WhatsApp</div>
                    <div style={{color: 'var(--muted)', fontSize: '13px'}}>
                      WhatsApp orqali ulashish
                    </div>
                  </div>
                </div>
                
                <div 
                  className="share-option" 
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`@${user.username} profilini ko'ring`)}&url=${encodeURIComponent(window.location.href)}`)}
                >
                  <div className="share-icon" style={{color: '#1da1f2'}}>
                    <i className="fa-brands fa-twitter"></i>
                  </div>
                  <div>
                    <div style={{fontWeight: '600'}}>Twitter</div>
                    <div style={{color: 'var(--muted)', fontSize: '13px'}}>
                      Twitter orqali ulashish
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}