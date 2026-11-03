'use client'

import { useState } from 'react'

export default function MilapHubHome() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [activeTab, setActiveTab] = useState('home')
  const [activeCategory, setActiveCategory] = useState('all')
  
  // Tip Modal States
  const [isTipModalOpen, setIsTipModalOpen] = useState(false)
  const [tipTarget, setTipTarget] = useState('')
  const [isNgo, setIsNgo] = useState(false)
  const [amount, setAmount] = useState(50)

  // Chat Drawer States
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatName, setChatName] = useState('')
  const [messages, setMessages] = useState<string[]>(['Salaam! Kaise ho?'])
  const [inputMsg, setInputMsg] = useState('')

  // Friend Requests State
  const [requests, setRequests] = useState([
    { id: 1, name: 'Arif Mohammed', mutual: '3 mutual friends', av: 'AM' },
    { id: 2, name: 'Sana Reddy', mutual: 'Madhapur', av: 'SR' }
  ])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  const openTipModal = (target: string, donate: boolean) => {
    setTipTarget(target)
    setIsNgo(donate)
    setIsTipModalOpen(true)
  }

  const openChat = (name: string) => {
    setChatName(name)
    setIsChatOpen(true)
  }

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMsg.trim()) return
    setMessages(prev => [...prev, inputMsg])
    setInputMsg('')
  }

  const calculateCut = () => {
    const cutPercentage = isNgo ? 0 : 30
    const cutAmount = Math.round((amount * cutPercentage) / 100)
    return isNgo
      ? `Verified NGO: 0% platform fee. Poora ₹${amount} unhe milta hai.`
      : `Creator ko ₹${amount - cutAmount} milega (platform fee ${cutPercentage}%).`
  }

  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style jsx global>{`
        :root {
          --bg: #eef3f2; --card: #fff; --ink: #12302f; --mute: #5d7776; --line: #dbe5e4; 
          --brand: #0f5c5a; --brand-ink: #fff; --gold: #f0a500; --soft: #e3efee; --danger: #c0392b;
        }
        [data-theme="dark"] {
          --bg: #0c1c1c; --card: #132a29; --ink: #e6f2f1; --mute: #8fb0ae; --line: #23413f; 
          --brand: #3cb5b0; --brand-ink: #062322; --soft: #1b3837;
        }
        * { box-sizing: border-box; }
        header { position: sticky; top: 0; z-index: 20; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; padding: 12px 16px; background: var(--card); border-bottom: 1px solid var(--line); }
        .logo { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 20px; letter-spacing: -.02em; }
        .logo i { width: 34px; height: 34px; border-radius: 50%; background: var(--brand); position: relative; display: block; }
        .logo i::before, .logo i::after { content: ""; position: absolute; top: 9px; width: 16px; height: 16px; border-radius: 50%; border: 3px solid var(--gold); }
        .logo i::before { left: 2px; } .logo i::after { right: 2px; border-color: var(--brand-ink); }
        nav { display: flex; gap: 4px; justify-content: center; }
        nav button { background: none; border: 0; border-bottom: 3px solid transparent; border-radius: 8px 8px 0 0; padding: 8px 18px; font-weight: 700; color: var(--mute); font-size: 13px; cursor: pointer; }
        nav button[aria-current=true] { color: var(--brand); border-bottom-color: var(--brand); }
        .tools { display: flex; justify-content: flex-end; gap: 8px; align-items: center; }
        .ic { width: 38px; height: 38px; border-radius: 50%; border: 0; background: var(--soft); font-weight: 700; cursor: pointer; position: relative; }
        .dot { position: absolute; top: -2px; right: -2px; background: var(--danger); color: #fff; border-radius: 99px; font-size: 10px; padding: 0 5px; }
        .av { width: 38px; height: 38px; border-radius: 50%; background: var(--gold); color: #3a2900; display: grid; place-items: center; font-weight: 800; flex: none; }
        .av.s { width: 32px; height: 32px; font-size: 13px; }
        .layout { display: grid; grid-template-columns: 260px minmax(0,1fr) 300px; gap: 20px; max-width: 1280px; margin: 0 auto; padding: 16px; }
        aside { position: sticky; top: 76px; align-self: start; max-height: calc(100vh - 90px); overflow: auto; }
        .side a { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 10px; color: var(--ink); text-decoration: none; font-weight: 500; }
        .side a:hover { background: var(--soft); }
        .side a b { width: 30px; height: 30px; border-radius: 8px; background: var(--soft); display: grid; place-items: center; font-size: 12px; color: var(--brand); }
        .legal { margin-top: 20px; padding: 0 10px; font-size: 12px; color: var(--mute); }
        .legal a { display: inline; padding: 0; color: var(--mute); margin-right: 8px; text-decoration: underline; }
        .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; margin-bottom: 14px; }
        .card h3 { margin: 0 0 10px; font-size: 15px; }
        .compose { display: flex; gap: 10px; align-items: center; }
        .compose button.in { flex: 1; text-align: left; background: var(--soft); border: 0; border-radius: 99px; padding: 10px 16px; color: var(--mute); cursor: pointer; }
        .chips { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 14px; padding-bottom: 2px; }
        .chip { white-space: nowrap; border: 1px solid var(--line); background: var(--card); border-radius: 99px; padding: 6px 14px; font-weight: 700; font-size: 13px; cursor: pointer; }
        .chip[aria-pressed=true] { background: var(--brand); color: var(--brand-ink); border-color: var(--brand); }
        .post-h { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
        .post-h small { color: var(--mute); display: block; line-height: 1.2; }
        .tag { margin-left: auto; font-size: 12px; font-weight: 700; background: var(--soft); color: var(--brand); padding: 3px 10px; border-radius: 99px; }
        .media { height: 180px; border-radius: 10px; margin: 10px 0; background: linear-gradient(135deg,var(--brand),var(--gold)); display: grid; place-items: end start; padding: 12px; color: #fff; font-weight: 800; font-size: 18px; }
        .acts { display: flex; gap: 6px; border-top: 1px solid var(--line); padding-top: 8px; margin-top: 8px; }
        .acts button { flex: 1; background: none; border: 0; border-radius: 8px; padding: 8px; font-weight: 700; color: var(--mute); cursor: pointer; }
        .acts button:hover { background: var(--soft); }
        .acts .tip { color: #3a2900; background: var(--gold); }
        .btn { border: 0; border-radius: 8px; padding: 7px 14px; font-weight: 700; background: var(--brand); color: var(--brand-ink); cursor: pointer; }
        .btn.g { background: var(--soft); color: var(--ink); }
        .row { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
        .row .grow { flex: 1; min-width: 0; }
        .alert { border-left: 4px solid var(--danger); padding-left: 10px; margin-bottom: 10px; }
        .alert small { color: var(--mute); }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: grid; place-items: center; z-index: 50; padding: 16px; }
        .sheet { background: var(--card); border-radius: 16px; padding: 20px; width: 100%; max-width: 380px; }
        .amts { display: flex; gap: 8px; margin: 12px 0; }
        .amts button { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); font-weight: 700; cursor: pointer; }
        .amts button[aria-pressed=true] { border-color: var(--brand); background: var(--soft); }
        .chat { position: fixed; right: 16px; bottom: 0; width: 300px; background: var(--card); border: 1px solid var(--line); border-radius: 12px 12px 0 0; z-index: 40; }
        .chat header { display: flex; padding: 10px 12px; border-radius: 12px 12px 0 0; font-weight: 700; position: static; }
        .msgs { height: 200px; overflow: auto; padding: 10px; display: flex; flex-direction: column; gap: 6px; }
        .m { max-width: 80%; padding: 7px 12px; border-radius: 14px; background: var(--soft); }
        .m.me { align-self: flex-end; background: var(--brand); color: var(--brand-ink); }
        @media(max-width:1100px){.side-l{display:none}}
        @media(max-width:760px){.side-r{display:none}.layout{grid-template-columns:1fr}}.on{position:relative}.on::after{content:"";position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;background:#2fb344;border:2px solid var(--card)}
      `}</style>

      {/* Header */}
      <header>
        <div className="logo"><i aria-hidden="true"></i>MilapHub</div>
        <nav aria-label="Main">
          {['home', 'reels', 'matri', 'market', 'pages'].map(tab => (
            <button key={tab} data-v={tab} aria-current={activeTab === tab} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
        <div className="tools">
          <button className="ic" id="theme" onClick={toggleTheme} aria-label="Switch theme">◐</button>
          <button className="ic" aria-label="Notifications">🔔<span className="dot">3</span></button>
          <div className="av">SA</div>
        </div>
      </header>

      {/* Layout Content */}
      <div className="layout">
        <aside className="side side-l">
          <a href="#"><span className="av s">SA</span>Your profile</a>
          <a href="#"><b>Pg</b>Pages</a>
          <a href="#"><b>Gr</b>Groups</a>
          <a href="#"><b>Sv</b>Saved posts</a>
          <a href="#"><b>Mt</b>Matrimony dashboard</a>
          <a href="#"><b>₹</b>Tips and payouts</a>
          <a href="#"><b>St</b>Settings</a>
          <div className="legal"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Cookies</a><br />© 2026 MilapHub</div>
        </aside>

        <main>
          {activeTab === 'home' && (
            <section className="view show">
              <div className="card compose">
                <div className="av">SA</div>
                <button className="in">Share a story, recipe or confession</button>
              </div>

              <div className="chips" role="group">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'news', label: 'Local stories' },
                  { id: 'confession', label: 'Confessions' },
                  { id: 'cooking', label: 'Cooking' },
                  { id: 'campaign', label: 'Verified campaigns' }
                ].map(cat => (
                  <button key={cat.id} className="chip" aria-pressed={activeCategory === cat.id} onClick={() => setActiveCategory(cat.id)}>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Feed Articles */}
              {(activeCategory === 'all' || activeCategory === 'news') && (
                <article className="card">
                  <div className="post-h"><div className="av">FK</div><div><b>Farhana Khan</b><small>Banjara Hills · 2h</small></div><span className="tag">Local story</span></div>
                  <p>Metro ka naya timing Ameerpet se Hitech City tak kaafi helpful raha. Subah 7 baje ki train mein ab seat mil jaati hai.</p>
                  <div className="acts"><button>Like 24</button><button>Comment 6</button><button className="tip" onClick={() => openTipModal('Farhana Khan', false)}>Send tip</button></div>
                </article>
              )}

              {(activeCategory === 'all' || activeCategory === 'cooking') && (
                <article className="card">
                  <div className="post-h"><div className="av">RB</div><div><b>Rubina’s Kitchen</b><small>Creator · 5h</small></div><span className="tag">Cooking</span></div>
                  <p>Ghar ki Hyderabadi dum biryani, 45 minute mein. Full recipe video neeche.</p>
                  <div className="media">Dum biryani, step by step</div>
                  <div className="acts"><button>Like 312</button><button>Comment 41</button><button className="tip" onClick={() => openTipModal("Rubina's Kitchen", false)}>Send tip</button></div>
                </article>
              )}

              {(activeCategory === 'all' || activeCategory === 'confession') && (
                <article className="card">
                  <div className="post-h"><div className="av">?</div><div><b>Anonymous</b><small>Kukatpally · 1d</small></div><span className="tag">Confession</span></div>
                  <p>Maine do saal se ghar walon ko nahi bataya ki job change kar li. Aaj bolne ka mann hai.</p>
                  <div className="acts"><button>Like 98</button><button>Comment 55</button><button className="tip" onClick={() => openTipModal('Anonymous', false)}>Send tip</button></div>
                </article>
              )}

              {(activeCategory === 'all' || activeCategory === 'campaign') && (
                <article className="card">
                  <div className="post-h"><div className="av">HC</div><div><b>Helping Hands Charity</b><small>Verified · 80G checked</small></div><span className="tag">Campaign</span></div>
                  <p>Niloufer Hospital ke bachon ke liye blood donation camp, Sunday 10 AM. Donate karne ke liye seedha tip bhej sakte hain.</p>
                  <div className="acts"><button>Like 140</button><button>Share</button><button className="tip" onClick={() => openTipModal('Helping Hands Charity', true)}>Donate</button></div>
                </article>
              )}
            </section>
          )}

          {activeTab !== 'home' && (
            <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
              <h2>{activeTab.charAt(0).toUpperCase() + activeTab.label?.slice(1) || activeTab} Section</h2>
              <p style={{ color: 'var(--mute)' }}>This module is active under the architectural roadmap.</p>
            </div>
          )}
        </main>

        <aside className="side-r">
          <div className="card">
            <h3>Friend requests</h3>
            {requests.map(req => (
              <div className="row" key={req.id}>
                <div className="av s">{req.av}</div>
                <div className="grow">
                  <b>{req.name}</b><small>{req.mutual}</small>
                  <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                    <button className="btn" onClick={() => setRequests(prev => prev.filter(r => r.id !== req.id))}>Accept</button>
                    <button className="btn g" onClick={() => setRequests(prev => prev.filter(r => r.id !== req.id))}>Decline</button>
                  </div>
                </div>
              </div>
            ))}
            {requests.length === 0 && <small style={{ color: 'var(--mute)' }}>No pending requests.</small>}
          </div>

          <div className="card">
            <h3>Friends online</h3>
            <div>
              {['Zaid Hussain', 'Neha Patel', 'Karthik S'].map((name, i) => (
                <button key={i} className="row" onClick={() => openChat(name)} style={{ background: 'none', border: 0, width: '100%', textAlign: 'left', padding: 0, cursor: 'pointer' }}>
                  <div className={`av s ${i < 2 ? 'on' : ''}`}>{name.split(' ').map(n => n[0]).join('')}</div>
                  <div className="grow"><b>{name}</b></div>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Emergency alerts</h3>
            <div className="alert"><b>O-negative blood chahiye</b><small>Verified · Gandhi Hospital</small></div>
            <div className="alert"><b>Flood relief, Old City</b><small>Verified · Helping Hands</small></div>
          </div>
        </aside>
      </div>

      {/* Tip / Donation Modal */}
      {isTipModalOpen && (
        <div className="modal" role="dialog">
          <div className="sheet">
            <h3 style={{ margin: 0 }}>{isNgo ? 'Donate' : 'Send a tip'}</h3>
            <div style={{ fontSize: '12px', color: 'var(--mute)', margin: '8px 0' }}>To: {tipTarget}</div>
            <div className="amts">
              {[20, 50, 100, 500].map(val => (
                <button key={val} aria-pressed={amount === val} onClick={() => setAmount(val)}>₹{val}</button>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--mute)', margin: '8px 0 14px' }}>{calculateCut()}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn g" onClick={() => setIsTipModalOpen(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn" onClick={() => { setIsTipModalOpen(false); alert('Demo: Razorpay checkout simulation executed.'); }} style={{ flex: 2 }}>Pay with Razorpay</button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Chat Drawer */}
      {isChatOpen && (
        <div className="chat">
          <header>
            <span>{chatName}</span>
            <button className="ic" onClick={() => setIsChatOpen(false)} style={{ marginLeft: 'auto', width: '28px', height: '28px' }}>×</button>
          </header>
          <div className="msgs">
            {messages.map((m, idx) => (
              <div key={idx} className={`m ${idx % 2 !== 0 ? 'me' : ''}`}>{m}</div>
            ))}
          </div>
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: '6px', padding: '8px', borderTop: '1px solid var(--line)' }}>
            <input value={inputMsg} onChange={e => setInputMsg(e.target.value)} placeholder="Write a message" style={{ flex: 1, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', borderRadius: '99px', padding: '8px 12px', outline: 'none' }} />
            <button className="btn" type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  )
}
