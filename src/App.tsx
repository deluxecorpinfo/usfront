import { useEffect, useMemo, useRef, useState } from 'react';
import { api, auth } from '@appdeploy/client';
import { ArrowLeft, BadgeCheck, BarChart3, BookOpen, Bot, BriefcaseBusiness, Building2, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Compass, FileText, Globe2, GraduationCap, Home, Inbox, Layers3, LockKeyhole, MessageCircle, Mic, Network, Pause, Play, Plus, Route, Search, Share2, ShieldCheck, Sparkles, Star, UserPlus, UserRound, Users, UsersRound, Video, Volume2 } from 'lucide-react';
import './rooms.css';
import ProfileExperience from './ProfileExperience';
import ReviewTour from './ReviewTour';

type Role = 'learner' | 'educator';
type EducatorType = 'individual' | 'organization';
type ViewMode = 'learner' | 'educator';
type RoomKind = 'campus' | 'academy' | 'school' | 'workshop';
type Profile = { role: Role; educatorType?: EducatorType; organizationType?: string; interests: string[]; studyField: string; educationLevel: string; voiceBio: string; name?: string; email?: string };
type ExploreItem = { id: string; title: string; creator: string; category: string; room: string; duration: string; podcast: boolean; score: number };
type AppUser = { userId: string; name?: string; email?: string; picture?: string };
type SpeechRecognitionInstance = { continuous: boolean; interimResults: boolean; lang: string; start: () => void; stop: () => void; onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null; onerror: (() => void) | null };
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

const presetInterests = ['Artificial Intelligence','Engineering','Medicine','Business','Psychology','History','Physics','Mathematics','Design','Architecture','Languages','Literature','Economics','Law','Music','Filmmaking','Space','Philosophy'];
const levels = ['High school','Undergraduate','Graduate','Professional','Independent learner'];
const orgTypes = ['School','University','Academy','Institute','Training center'];

function App() {
  const [user,setUser]=useState<AppUser|null>(null);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [loading,setLoading]=useState(true);
  const [introReady,setIntroReady]=useState(false);
  const [step,setStep]=useState(0);
  const [activeTab,setActiveTab]=useState('explore');
  const [viewMode,setViewMode]=useState<ViewMode>('learner');
  const [roomView,setRoomView]=useState<RoomKind|null>(null);
  const [explore,setExplore]=useState<ExploreItem[]>([]);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [form,setForm]=useState<Profile>({role:'learner',interests:[],studyField:'',educationLevel:'',voiceBio:''});
  const [customInterest,setCustomInterest]=useState('');
  const [recording,setRecording]=useState(false);
  const [audioUrl,setAudioUrl]=useState('');
  const [micError,setMicError]=useState('');
  const recorderRef=useRef<MediaRecorder|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const recognitionRef=useRef<SpeechRecognitionInstance|null>(null);
  const chunksRef=useRef<Blob[]>([]);
  const firstName=useMemo(()=>profile?.name?.split(' ')[0]||user?.name?.split(' ')[0]||'Learner',[profile,user]);

  useEffect(()=>{void boot(); return()=>{streamRef.current?.getTracks().forEach(t=>t.stop()); recognitionRef.current?.stop();};},[]);
  useEffect(()=>{const t=window.setTimeout(()=>setIntroReady(true),3000); return()=>window.clearTimeout(t);},[]);
  async function boot(){try{if(auth.isSignedIn()){const u=await auth.getUser();if(u){setUser(u);await loadProfile();}}}finally{setLoading(false);}}
  async function loadProfile(){try{const r=await api.get('/api/profile');if(r.data?.profile){const p=r.data.profile as Profile;setProfile(p);setForm(p);setViewMode(p.role==='educator'?'educator':'learner');await loadExplore();}}catch{}}
  async function loadExplore(){try{const r=await api.get('/api/explore');setExplore(r.data?.items||[]);}catch{setExplore([]);}}
  async function signIn(){setError('');try{const r=await auth.signIn();setUser(r.user);await loadProfile();}catch(e){const code=(e as {code?:string}).code;setError(code==='popup_blocked'?'Allow pop-ups to sign in.':code==='popup_closed'?'Sign-in was cancelled.':'Sign-in failed. Please try again.');}}
  async function signOut(){await auth.signOut();setUser(null);setProfile(null);setStep(0);setExplore([]);setRoomView(null);setActiveTab('explore');}
  function toggleInterest(i:string){setForm(f=>({...f,interests:f.interests.includes(i)?f.interests.filter(x=>x!==i):[...f.interests,i]}));}
  function addInterest(){const v=customInterest.replace(/\s+/g,' ').trim();if(!v)return;setForm(f=>f.interests.some(x=>x.toLocaleLowerCase()===v.toLocaleLowerCase())?f:{...f,interests:[...f.interests,v]});setCustomInterest('');setError('');}
  function next(){setError('');if(step===0){setStep(1);return;}if(step===1&&form.interests.length===0){setError('Choose at least one interest or add your own.');return;}if(step===2&&!form.studyField.trim()){setError('Add your study field or learning direction.');return;}setStep(s=>Math.min(3,s+1));}
  async function complete(){if(!form.voiceBio.trim()){setError('Add a short biography by voice or text so Explore can start personalized.');return;}setSaving(true);setError('');try{const r=await api.post('/api/profile',form);setProfile(r.data.profile);setViewMode(form.role==='educator'?'educator':'learner');await loadExplore();setActiveTab('explore');}catch{setError('Could not save your profile. Try again.');}finally{setSaving(false);}}
  async function startVoice(){setMicError('');try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});streamRef.current=stream;chunksRef.current=[];const mime=MediaRecorder.isTypeSupported('audio/mp4')?'audio/mp4':MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':'';const rec=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);recorderRef.current=rec;rec.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data)};rec.onstop=()=>{const blob=new Blob(chunksRef.current,{type:rec.mimeType||'audio/webm'});if(audioUrl)URL.revokeObjectURL(audioUrl);setAudioUrl(URL.createObjectURL(blob));stream.getTracks().forEach(t=>t.stop());};rec.start();const w=window as Window & {SpeechRecognition?:SpeechRecognitionCtor;webkitSpeechRecognition?:SpeechRecognitionCtor};const Ctor=w.SpeechRecognition||w.webkitSpeechRecognition;if(Ctor){const sr=new Ctor();sr.continuous=true;sr.interimResults=false;sr.lang='en-US';sr.onresult=e=>{let text='';for(let i=0;i<e.results.length;i++){if(e.results[i].isFinal)text+=' '+e.results[i][0].transcript;}if(text.trim())setForm(f=>({...f,voiceBio:(f.voiceBio+' '+text.trim()).trim()}));};sr.onerror=()=>setMicError('Voice transcription is not available on this device. You can still record and type the biography below.');recognitionRef.current=sr;sr.start();}else setMicError('Live transcription is not available on this device. Record your voice, then type the short biography below.');setRecording(true);window.setTimeout(()=>{if(recorderRef.current?.state==='recording')stopVoice();},120000);}catch{setMicError('Microphone permission is required. You can type your biography instead.');}}
  function stopVoice(){if(recorderRef.current?.state==='recording')recorderRef.current.stop();recognitionRef.current?.stop();recognitionRef.current=null;setRecording(false);}
  function openRooms(){setActiveTab('rooms');setRoomView(null);}

  if(loading)return <IntroReference loading/>;
  if(!user)return <IntroReference ready={introReady} onContinue={signIn} error={error}/>;
  if(window.location.hash==='#tour')return <ReviewTour/>;
  if(!profile)return <Onboarding step={step} form={form} setForm={setForm} customInterest={customInterest} setCustomInterest={setCustomInterest} toggleInterest={toggleInterest} addInterest={addInterest} next={next} back={()=>setStep(s=>Math.max(0,s-1))} complete={complete} saving={saving} error={error} recording={recording} startVoice={startVoice} stopVoice={stopVoice} audioUrl={audioUrl} micError={micError}/>;

  return <main className='app-shell'>
    <header className='topbar'><Brand compact/><div className='top-actions'><Search size={21}/><button className='avatar-btn' onClick={()=>setActiveTab('profile')}>{user.picture?<img src={user.picture} alt='Profile'/>:<UserRound size={19}/>}</button></div></header>
    {profile.role==='educator'&&<div className='mode-switch'><button className={viewMode==='educator'?'active':''} onClick={()=>setViewMode('educator')}>Teach</button><button className={viewMode==='learner'?'active':''} onClick={()=>setViewMode('learner')}>Learn</button></div>}
    <section className='content'>
      {activeTab==='explore'?<Explore firstName={firstName} items={explore} viewMode={viewMode}/>:activeTab==='rooms'?<RoomsExperience selected={roomView} onSelect={setRoomView}/>:activeTab==='profile'?<ProfileView profile={profile} viewMode={viewMode} signOut={signOut}/>:<ComingSoon tab={activeTab}/>} 
    </section>
    <nav className='bottom-nav'><NavButton icon={<Home/>} label='Explore' active={activeTab==='explore'} onClick={()=>{setActiveTab('explore');setRoomView(null);}}/><NavButton icon={<BookOpen/>} label='Rooms' active={activeTab==='rooms'} onClick={openRooms}/><NavButton icon={<Plus/>} label='Create' active={activeTab==='create'} onClick={()=>setActiveTab('create')} raised/><NavButton icon={<Inbox/>} label='Inbox' active={activeTab==='inbox'} onClick={()=>setActiveTab('inbox')}/><NavButton icon={<UserRound/>} label='Profile' active={activeTab==='profile'} onClick={()=>setActiveTab('profile')}/></nav>
  </main>;
}

function IntroReference({ready=false,onContinue,error='',loading=false}:{ready?:boolean;onContinue?:()=>void;error?:string;loading?:boolean}){return <main className='intro-reference-shell'><div className='intro-reference-content'><div className='intro-reference-orbit'><span className='reference-ring rr1'/><span className='reference-ring rr2'/><span className='reference-ring rr3'/><i className='reference-dot d1'/><i className='reference-dot d2'/><i className='reference-dot d3'/><div className='intro-reference-disc'><Brand logoOnly/></div></div><p className='intro-reference-kicker'>NEXT-GENERATION EDUCATION SYSTEM</p><h1>Universal School</h1><div className='intro-reference-divider'><i/><b/><i/></div><p className='intro-reference-tagline'>Learn and Teach Without Limits</p>{!loading&&<button className={ready?'intro-reference-button ready':'intro-reference-button'} disabled={!ready} onClick={onContinue}>Continue <ChevronRight size={20}/></button>}{error&&<p className='error intro-reference-error'>{error}</p>}</div><div className='intro-reference-base'/></main>}
function Brand({compact=false,logoOnly=false}:{compact?:boolean;logoOnly?:boolean}){const [ok,setOk]=useState(true);return <div className={compact?'brand compact':'brand'}>{ok&&<img src='./resources/logo.png' alt='Universal School logo' onError={()=>setOk(false)}/>} {!ok&&<span className='brand-mark'>U</span>}{!logoOnly&&<span>UNIVERSAL <b>SCHOOL</b></span>}</div>}

function Onboarding(p:{step:number;form:Profile;setForm:React.Dispatch<React.SetStateAction<Profile>>;customInterest:string;setCustomInterest:(v:string)=>void;toggleInterest:(v:string)=>void;addInterest:()=>void;next:()=>void;back:()=>void;complete:()=>void;saving:boolean;error:string;recording:boolean;startVoice:()=>void;stopVoice:()=>void;audioUrl:string;micError:string}){return <main className='onboard-shell'><div className='onboard-top'><Brand compact/><span>{p.step+1}/4</span></div><div className='progress'><i style={{width:`${(p.step+1)*25}%`}}/></div><section className='onboard-card'>{p.step>0&&<button className='back' onClick={p.back}><ChevronLeft/> Back</button>}{p.step===0&&<><p className='eyebrow'>YOUR ROLE</p><h2>How will you start?</h2><p className='sub'>This sets your tools. Educators can switch to learning mode anytime.</p><div className='role-grid'><button className={p.form.role==='learner'?'role active':''} onClick={()=>p.setForm(f=>({...f,role:'learner',educatorType:undefined,organizationType:undefined}))}><GraduationCap/><b>Student</b><span>Learn, follow rooms and build your knowledge graph.</span></button><button className={p.form.role==='educator'?'role active':''} onClick={()=>p.setForm(f=>({...f,role:'educator',educatorType:f.educatorType||'individual'}))}><Users/><b>Educator</b><span>Teach as a person or an educational organization.</span></button></div>{p.form.role==='educator'&&<div className='educator-options'><label>Educator type</label><div className='seg'><button className={p.form.educatorType==='individual'?'active':''} onClick={()=>p.setForm(f=>({...f,educatorType:'individual',organizationType:undefined}))}>Individual</button><button className={p.form.educatorType==='organization'?'active':''} onClick={()=>p.setForm(f=>({...f,educatorType:'organization'}))}>Organization</button></div>{p.form.educatorType==='organization'&&<select value={p.form.organizationType||''} onChange={e=>p.setForm(f=>({...f,organizationType:e.target.value}))}><option value=''>Choose organization type</option>{orgTypes.map(x=><option key={x}>{x}</option>)}</select>}</div>}</>}{p.step===1&&<><p className='eyebrow'>PERSONALIZE DISCOVERY</p><h2>What are you curious about?</h2><p className='sub'>Pick anything. You can change this later.</p><div className='chips'>{presetInterests.map(i=><button key={i} className={p.form.interests.includes(i)?'chip active':'chip'} onClick={()=>p.toggleInterest(i)}>{i}</button>)}</div><div className='custom-row'><input value={p.customInterest} onChange={e=>p.setCustomInterest(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();p.addInterest();}}} placeholder='Add another interest…' enterKeyHint='done'/><button type='button' disabled={!p.customInterest.trim()} onClick={p.addInterest}>Add</button></div>{p.form.interests.some(i=>!presetInterests.includes(i))&&<div className='custom-added'><span>Added interests</span><div className='chips small'>{p.form.interests.filter(i=>!presetInterests.includes(i)).map(i=><button type='button' className='chip active removable' key={i} onClick={()=>p.toggleInterest(i)}>{i}<b>×</b></button>)}</div></div>}</>}{p.step===2&&<><p className='eyebrow'>LEARNING CONTEXT</p><h2>Tell us where you are going.</h2><label>Study field or learning direction</label><input value={p.form.studyField} onChange={e=>p.setForm(f=>({...f,studyField:e.target.value}))} placeholder='e.g. Chemical engineering, filmmaking…'/><label>Current level</label><select value={p.form.educationLevel} onChange={e=>p.setForm(f=>({...f,educationLevel:e.target.value}))}><option value=''>Choose a level</option>{levels.map(x=><option key={x}>{x}</option>)}</select></>}{p.step===3&&<><p className='eyebrow'>VOICE BIOGRAPHY</p><h2>Introduce your mind.</h2><p className='sub'>Tell us what you know, what you want to learn and what you want to become. This becomes the first signal for Explore.</p><div className={p.recording?'mic-card recording':'mic-card'}><button onClick={p.recording?p.stopVoice:p.startVoice}>{p.recording?<Pause/>:<Mic/>}</button><div><b>{p.recording?'Listening…':'Record up to 2 minutes'}</b><span>{p.recording?'Speak naturally.':'Tap the microphone to start.'}</span></div></div>{p.audioUrl&&<audio controls src={p.audioUrl}/>} {p.micError&&<p className='hint'>{p.micError}</p>}<label>Biography transcript / text</label><textarea value={p.form.voiceBio} onChange={e=>p.setForm(f=>({...f,voiceBio:e.target.value}))} placeholder='Example: I study engineering, I love space technology and want to understand AI deeply…'/><div className='signal-note'><Sparkles size={18}/><span>Your interests + field + biography form the first Explore signal. Later, behavior will continuously improve it.</span></div></>}{p.error&&<p className='error'>{p.error}</p>}<button className='primary' onClick={p.step===3?p.complete:p.next} disabled={p.saving}>{p.saving?'Creating your world…':p.step===3?'Build my Explore':'Continue'} <ChevronRight size={18}/></button></section></main>}

function Explore({firstName,items,viewMode}:{firstName:string;items:ExploreItem[];viewMode:ViewMode}){return <><div className='welcome'><div><p className='eyebrow'>{viewMode==='educator'?'EDUCATOR SPACE':'FOR YOU'}</p><h2>{viewMode==='educator'?'Your teaching universe':`Good to see you, ${firstName}.`}</h2></div><div className='spark'><Sparkles/></div></div>{viewMode==='educator'?<div className='educator-dashboard'><div className='stat'><b>0</b><span>Rooms</span></div><div className='stat'><b>0</b><span>Videos</span></div><div className='stat'><b>0</b><span>Learners</span></div><button className='create-room'><Plus/> Create your first Room</button></div>:<><div className='section-head'><h3>Built for your interests</h3><Compass size={19}/></div><div className='feed'>{items.map((x,i)=><article className='video-card' key={x.id}><div className={`thumb t${i%4}`}><div className='play'><Play fill='currentColor'/></div><span className='duration'>{x.duration}</span>{x.podcast&&<span className='pod'><Volume2 size={13}/> Podcast</span>}</div><div className='video-meta'><div className='creator-dot'>{x.creator[0]}</div><div><h4>{x.title}</h4><p>{x.creator} · {x.category}</p><span className='room-pill'>{x.room}</span></div></div></article>)}</div></>}</>}

function RoomsExperience({selected,onSelect}:{selected:RoomKind|null;onSelect:(room:RoomKind|null)=>void}){
  if(selected)return <RoomDetail kind={selected} onBack={()=>onSelect(null)}/>;
  return <div className='rooms-page'>
    <section className='rooms-hero'><p className='eyebrow'>LEARNING ARCHITECTURE</p><div className='rooms-title-row'><div><h2>Rooms shape your education.</h2><p>Institutions, RAVIs and learners can build different learning systems without forcing everyone into one model.</p></div><div className='room-orbit'><Network/><span>4</span></div></div></section>
    <div className='room-type-grid'>
      <RoomTypeCard kind='campus' title='Campus' kicker='INSTITUTION-LED' text='A verified school, university or educational organization with subjects, faculty and flexible access.' icon={<Building2/>} meta={['Verified institution','Free · Paid · Approval']} onOpen={()=>onSelect('campus')}/>
      <RoomTypeCard kind='academy' title='Academy' kicker='RAVI COLLECTIVE' text='Independent RAVIs form a governed online academy and build shared curriculum together.' icon={<UsersRound/>} meta={['Multi-RAVI','Contract governed']} onOpen={()=>onSelect('academy')}/>
      <RoomTypeCard kind='school' title='School' kicker='LEARNER-BUILT' text='Your private educational institution assembled from the teachers, courses, Academies and Campuses you choose.' icon={<Layers3/>} meta={['Private by default','Fully personalized']} onOpen={()=>onSelect('school')}/>
      <RoomTypeCard kind='workshop' title='Workshop' kicker='COLLABORATIVE WORK' text='A shared project space for assignments, research, teamwork, submissions, feedback and an AI assistant.' icon={<BriefcaseBusiness/>} meta={['Project workspace','AI co-pilot']} onOpen={()=>onSelect('workshop')}/>
    </div>
    <section className='room-foundation'><div><Sparkles/><span>Every Room can carry video, podcast, text, documents and Universal Score.</span></div><ChevronRight/></section>
  </div>;
}

function RoomTypeCard({kind,title,kicker,text,icon,meta,onOpen}:{kind:RoomKind;title:string;kicker:string;text:string;icon:React.ReactNode;meta:string[];onOpen:()=>void}){return <button className={`room-type-card ${kind}`} onClick={onOpen}><div className='room-card-top'><span className='room-card-icon'><img src='./resources/logo.png' alt=''/><i>{icon}</i></span><ChevronRight/></div><p className='room-card-kicker'>{kicker}</p><h3>{title}</h3><p>{text}</p><div className='room-card-meta'>{meta.map(x=><span key={x}>{x}</span>)}</div></button>}

function RoomDetail({kind,onBack}:{kind:RoomKind;onBack:()=>void}){
  return <div className={`room-detail ${kind}-room`}>
    <button className='room-back' onClick={onBack}><ArrowLeft size={18}/> All Rooms</button>
    {kind==='campus'?<CampusRoom/>:kind==='academy'?<AcademyRoom/>:kind==='school'?<SchoolRoom/>:<WorkshopRoom/>}
  </div>;
}

function CampusRoom(){return <>
  <RoomHero icon={<Building2/>} label='CAMPUS · VERIFIED INSTITUTION' title='Bilim University' text='One institutional home for official curriculum, faculty-led teaching and campus-specific learning.' badges={[<><BadgeCheck/> Verified</>,<><Globe2/> Public + private</>,<><ShieldCheck/> Student access</>]} stats={[['12','Departments'],['142','Faculty'],['18.4K','Learners']]}/>
  <RoomTabs labels={['Overview','Subjects','Faculty','Updates']}/>
  <div className='room-layout'>
    <div className='room-main-stack'>
      <RoomSection title='Curriculum lanes' action='View all'>
        <LearningLane icon={<Route/>} title='Mathematics' sub='Shared curriculum · one official content line' meta='24 lessons · 8 resources' score={94}/>
        <LearningLane icon={<UsersRound/>} title='Physics' sub='Faculty-led · each professor can publish a track' meta='6 instructors · 31 lessons' score={91}/>
        <LearningLane icon={<Building2/>} title='Computer Engineering' sub='Campus tracks · Istanbul + Ankara' meta='2 campuses · 18 modules' score={89}/>
      </RoomSection>
      <RoomSection title='Faculty to follow' action='See faculty'>
        <div className='faculty-row'><FacultyAvatar initials='DA' name='Dr. Aydin' subject='Mathematics'/><FacultyAvatar initials='SE' name='Selin Erdem' subject='Physics'/><FacultyAvatar initials='MK' name='M. Kaya' subject='Engineering'/></div>
      </RoomSection>
    </div>
    <aside className='room-side-stack'>
      <InfoPanel icon={<LockKeyhole/>} title='Access architecture'><InfoRow label='Verified students' value='Automatic'/><InfoRow label='Public courses' value='Enabled'/><InfoRow label='Paid programs' value='Enabled'/><InfoRow label='Approval-only spaces' value='Available'/></InfoPanel>
      <InfoPanel icon={<FileText/>} title='Institution feed'><p className='side-note'>Official announcements, faculty updates and new course releases live in one controlled stream.</p></InfoPanel>
    </aside>
  </div>
</>}

function AcademyRoom(){return <>
  <RoomHero icon={<UsersRound/>} label='ACADEMY · RAVI COLLECTIVE' title='Nova Learning Collective' text='Independent RAVIs build one online academy without giving up their individual identities or courses.' badges={[<><ShieldCheck/> Governed</>,<><Globe2/> Global</>]} stats={[['5','RAVIs'],['14','Courses'],['2.8K','Learners']]}/>
  <RoomTabs labels={['Academy','Courses','RAVIs','Agreement']}/>
  <div className='room-layout'>
    <div className='room-main-stack'>
      <RoomSection title='Academy RAVIs' action='Governance'>
        <div className='academy-members'><AcademyMember initials='NA' name='Nora A.' field='AI'/><AcademyMember initials='KM' name='Kaan M.' field='Math'/><AcademyMember initials='LS' name='Lena S.' field='Design'/><AcademyMember initials='AR' name='Amir R.' field='Business'/><button className='invite-member'><UserPlus/><span>Propose RAVI</span></button></div>
      </RoomSection>
      <RoomSection title='Shared learning tracks' action='All tracks'>
        <LearningLane icon={<Sparkles/>} title='AI Foundations' sub='Nora + Kaan · shared learning track' meta='18 lessons · 6 modules' score={95}/>
        <LearningLane icon={<Layers3/>} title='Product Builder' sub='Cross-discipline track · AI + design + business' meta='4 RAVIs · 26 lessons' score={92}/>
      </RoomSection>
    </div>
    <aside className='room-side-stack'>
      <InfoPanel icon={<ClipboardCheck/>} title='Online agreement'><div className='agreement-status'><CheckCircle2/><div><b>Agreement active</b><span>Version 1.3 · signed by 5/5</span></div></div><div className='governance-flow'><span>Join request</span><ChevronRight/><span>100% vote</span><ChevronRight/><span>E-sign</span></div></InfoPanel>
      <InfoPanel icon={<ShieldCheck/>} title='Governance rule'><p className='side-note'>Membership changes require unanimous approval. Financial and content rights remain attached to the signed agreement.</p></InfoPanel>
    </aside>
  </div>
</>}

function SchoolRoom(){return <>
  <RoomHero icon={<Layers3/>} label='SCHOOL · PERSONAL LEARNING SYSTEM' title='My Future School' text='A private school assembled by the learner from the best teachers, courses, Academies and Campuses for a specific goal.' badges={[<><LockKeyhole/> Private by default</>,<><Sparkles/> Personalized</>,<><Share2/> Shareable later</>]} stats={[['6','Sources'],['3','Learning paths'],['42%','Progress']]}/>
  <RoomTabs labels={['My path','Sources','Progress','Recommendations']}/>
  <div className='room-layout school-layout'>
    <div className='room-main-stack'>
      <section className='school-goal'><div><p className='room-card-kicker'>PRIMARY GOAL</p><h3>Become an AI product builder</h3><p>12-week personalized path combining technical foundations, product thinking and communication.</p></div><span className='goal-ring'>42%</span></section>
      <RoomSection title='Your learning map' action='Edit path'><div className='learning-map'><MapNode n='01' type='Campus' title='Bilim University · Mathematics'/><span className='map-line'/><MapNode n='02' type='Academy' title='Nova · AI Foundations'/><span className='map-line'/><MapNode n='03' type='RAVI' title='Lena · Product Design'/></div></RoomSection>
      <RoomSection title='Sources in this School' action='Add source'><div className='source-grid'><SourceCard type='Campus' name='Bilim University' detail='Mathematics'/><SourceCard type='Academy' name='Nova Collective' detail='AI Foundations'/><SourceCard type='RAVI' name='Lena Stein' detail='Product Design'/><button className='source-add'><Plus/><span>Add RAVI, course or Room</span></button></div></RoomSection>
    </div>
    <aside className='room-side-stack'>
      <InfoPanel icon={<Sparkles/>} title='Personalization engine'><InfoRow label='Goal alignment' value='High'/><InfoRow label='Level match' value='Adaptive'/><InfoRow label='Learning pace' value='Adaptive'/><InfoRow label='Weekly load' value='5h 30m'/></InfoPanel>
      <InfoPanel icon={<BarChart3/>} title='Next recommendation'><p className='side-note'>Your path is strong in theory but light on hands-on projects. Add one Workshop after Module 2.</p></InfoPanel>
    </aside>
  </div>
</>}

function WorkshopRoom(){return <>
  <RoomHero icon={<BriefcaseBusiness/>} label='WORKSHOP · COLLABORATIVE SPACE' title='Solar Energy Lab' text='A shared project room for assignments, research, teamwork, submissions, teacher feedback and an always-present AI assistant.' badges={[<><LockKeyhole/> Invite only</>,<><Bot/> AI active</>,<><Clock3/> Due Friday</>]} stats={[['4','Members'],['7','Files'],['68%','Complete']]}/>
  <RoomTabs labels={['Workspace','Discussion','Files','Submission']}/>
  <div className='workshop-layout'>
    <div className='workshop-board'>
      <div className='board-head'><div><p className='room-card-kicker'>PROJECT BOARD</p><h3>Build a solar micro-grid model</h3></div><button><UserPlus/> Invite</button></div>
      <div className='task-columns'><TaskColumn title='To do' count='2'><TaskCard title='Compare battery options' tag='Research'/><TaskCard title='Cite 3 academic sources' tag='Sources'/></TaskColumn><TaskColumn title='In progress' count='2'><TaskCard title='System efficiency model' tag='Calculation'/><TaskCard title='Final presentation' tag='Team'/></TaskColumn><TaskColumn title='Ready' count='1'><TaskCard title='Project brief' tag='Approved' done/></TaskColumn></div>
    </div>
    <aside className='ai-workshop'><div className='ai-head'><span><Bot/></span><div><b>Universal AI</b><small>Workshop co-pilot</small></div><i>LIVE</i></div><div className='ai-message'>Your efficiency calculation uses a 20°C reference, while the brief specifies 25°C. I can show the affected section.</div><div className='ai-actions'><button><FileText/> Check sources</button><button><ClipboardCheck/> Review rubric</button><button><Sparkles/> Improve draft</button></div><div className='ai-reference'><p>Suggested reference</p><b>Photovoltaic system performance</b><span>Academic source · relevance 96%</span></div><div className='ai-input'><span>Ask about this Workshop…</span><MessageCircle/></div></aside>
  </div>
</>}

function RoomHero({icon,label,title,text,badges,stats}:{icon:React.ReactNode;label:string;title:string;text:string;badges:React.ReactNode[];stats:[string,string][]}){return <section className='room-detail-hero'><div className='room-hero-main'><span className='room-hero-icon'>{icon}</span><div><p className='room-card-kicker'>{label}</p><h2>{title}</h2><p>{text}</p><div className='room-hero-badges'>{badges.map((x,i)=><span key={i}>{x}</span>)}</div></div></div><div className='room-hero-stats'>{stats.map(([v,l])=><div key={l}><b>{v}</b><span>{l}</span></div>)}</div></section>}
function RoomTabs({labels}:{labels:string[]}){return <div className='room-tabs'>{labels.map((x,i)=><button className={i===0?'active':''} key={x}>{x}</button>)}</div>}
function RoomSection({title,action,children}:{title:string;action?:string;children:React.ReactNode}){return <section className='room-section'><div className='room-section-head'><h3>{title}</h3>{action&&<button>{action}<ChevronRight/></button>}</div>{children}</section>}
function LearningLane({icon,title,sub,meta,score}:{icon:React.ReactNode;title:string;sub:string;meta:string;score:number}){return <article className='learning-lane'><span className='lane-icon'>{icon}</span><div className='lane-copy'><b>{title}</b><p>{sub}</p><span>{meta}</span></div><UniversalScore score={score}/></article>}
function UniversalScore({score}:{score:number}){return <details className='score-detail'><summary><Star fill='currentColor'/><b>{score}</b><span>Score</span></summary><div className='score-pop'><p><b>Universal Score</b><span>{score}/100</span></p><ScoreLine label='Learner rating' value='23/25'/><ScoreLine label='Watch quality' value='22/25'/><ScoreLine label='Engagement' value='13/15'/><ScoreLine label='AI review' value='24/25'/><ScoreLine label='Trust + access' value='9/10'/></div></details>}
function ScoreLine({label,value}:{label:string;value:string}){return <div className='score-line'><span>{label}</span><b>{value}</b></div>}
function FacultyAvatar({initials,name,subject}:{initials:string;name:string;subject:string}){return <button className='faculty-person'><span>{initials}</span><b>{name}</b><small>{subject}</small><i><Plus/></i></button>}
function AcademyMember({initials,name,field}:{initials:string;name:string;field:string}){return <div className='academy-member'><span>{initials}</span><b>{name}</b><small>{field}</small><BadgeCheck/></div>}
function InfoPanel({icon,title,children}:{icon:React.ReactNode;title:string;children:React.ReactNode}){return <section className='info-panel'><div className='info-title'><span>{icon}</span><h3>{title}</h3></div>{children}</section>}
function InfoRow({label,value}:{label:string;value:string}){return <div className='info-row'><span>{label}</span><b>{value}</b></div>}
function MapNode({n,type,title}:{n:string;type:string;title:string}){return <div className='map-node'><span>{n}</span><div><small>{type}</small><b>{title}</b></div><CheckCircle2/></div>}
function SourceCard({type,name,detail}:{type:string;name:string;detail:string}){return <article className='source-card'><span>{type==='Campus'?<Building2/>:type==='Academy'?<UsersRound/>:<UserRound/>}</span><small>{type}</small><b>{name}</b><p>{detail}</p><CheckCircle2/></article>}
function TaskColumn({title,count,children}:{title:string;count:string;children:React.ReactNode}){return <section className='task-column'><div><b>{title}</b><span>{count}</span></div>{children}</section>}
function TaskCard({title,tag,done=false}:{title:string;tag:string;done?:boolean}){return <article className={done?'task-card done':'task-card'}><span>{done?<CheckCircle2/>:<Clock3/>}</span><div><b>{title}</b><small>{tag}</small></div></article>}

function ProfileView({profile,viewMode,signOut}:{profile:Profile;viewMode:ViewMode;signOut:()=>void}){return <ProfileExperience profile={profile} viewMode={viewMode} signOut={signOut}/>}
function ComingSoon({tab}:{tab:string}){const map:Record<string,{icon:React.ReactNode,title:string,text:string}>={create:{icon:<Video/>,title:'Create',text:'Video publishing and educator creation tools are reserved in the architecture.'},inbox:{icon:<Inbox/>,title:'Inbox',text:'Direct messages and social conversations will connect learners and educators here.'}};const x=map[tab]||map.create;return <div className='coming'><div className='coming-icon'>{x.icon}</div><p className='eyebrow'>FOUNDATION READY</p><h2>{x.title}</h2><p>{x.text}</p><span>Next phase</span></div>}
function NavButton({icon,label,active,onClick,raised=false}:{icon:React.ReactNode;label:string;active:boolean;onClick:()=>void;raised?:boolean}){return <button onClick={onClick} className={`${active?'active ':''}${raised?'raised':''}`}>{icon}<span>{label}</span></button>}
export default App;