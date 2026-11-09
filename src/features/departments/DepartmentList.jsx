import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ArrowLeft, FilePlus2, Eye, SquarePen, Trash2, Copy } from 'lucide-react';
// ===== [DEPT-STATUS-01 | Font Awesome Imports] =====
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import './Department.css';

const API = 'http://localhost:5000/api';
const empty = {department_code:'',department_name:'',organization_id:'',company_id:'',branch_id:'',department_type_id:'',dept_head_id:'',dept_head_email:'',dept_head_contact:'',description:'',location:'',status:'Active'};
async function call(path, options={}) {
  const response=await fetch(API+path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json().catch(()=>null);
  if(!response.ok) throw new Error(data?.message||`Request failed (${response.status})`);
  return data;
}
const options=(items)=>(items||[]).map(x=><option key={x.id} value={x.id}>{x.code ? `${x.code} — ` : ''}{x.name}</option>);

// ===== [DEPT-LIST-01 | Independent module: does not modify Organization state] =====
export default function DepartmentList(){
 const [records,setRecords]=useState([]),[organizations,setOrganizations]=useState([]),[companies,setCompanies]=useState([]),[branches,setBranches]=useState([]);
 const [selected,setSelected]=useState(null),[mode,setMode]=useState('list'),[form,setForm]=useState(empty),[filters,setFilters]=useState({code:'',name:'',status:''});
 // ===== [DEPT-DELETE-01 | Delete Confirmation Popup State] =====
const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [lookup,setLookup]=useState(''),[lookupQuery,setLookupQuery]=useState('');
  const [lookupName,setLookupName]=useState(''),[lookupStatus,setLookupStatus]=useState('');
  const [lookupPage,setLookupPage]=useState(1),[lookupPerPage,setLookupPerPage]=useState(5);
 const [page,setPage]=useState(1),[perPage,setPerPage]=useState(5),[sort,setSort]=useState('asc'),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{const data=await call('/departments');setRecords(data);return data},[]);
 // ===== [DEPT-LOOKUP-01 | Fetch Organizations from PostgreSQL] =====
useEffect(() => {
  load().catch(e => setError(e.message));

  // ===== [DEPT-LOOKUP-01 | Organization API Data Mapping] =====
// ===== [DEPT-LOOKUP-01 | Organization API Data Mapping] =====
call('/organizations')
  .then(result => {
    const data = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : [];

    const organizationList = data.map(org => ({
      id: org.id,
      code: org.organization_code ?? org.code ?? '',
      name: org.organization_name ?? org.name ?? '',
      status: org.status ?? 'Active'
    }));

    setOrganizations(organizationList);
  })
  .catch(e => setError(e.message));
}, [load]);
 // ===== [DEPT-LOOKUP-04 | Company Data Fetch] =====

useEffect(() => {
  if (!form.organization_id) {
    setCompanies([]);
    return;
  }

  call(`/lookups/department-companies?organization_id=${form.organization_id}`)
    .then(data => {
      console.log("Selected Organization ID:", form.organization_id);
      console.log("Company API Response:", data);

      setCompanies(data);
    })
    .catch(e => setError(e.message));

}, [form.organization_id]);
 useEffect(()=>{if(!form.company_id){setBranches([]);return}call(`/lookups/department-branches?company_id=${form.company_id}`).then(setBranches).catch(e=>setError(e.message))},[form.company_id]);
 const filtered=useMemo(()=>records.filter(x=>String(x.department_code).toLowerCase().includes(filters.code.toLowerCase())&&String(x.department_name).toLowerCase().includes(filters.name.toLowerCase())&&(!filters.status||x.status===filters.status)).sort((a,b)=>sort==='asc'?a.department_code.localeCompare(b.department_code):b.department_code.localeCompare(a.department_code)),[records,filters,sort]);
 const pages=Math.max(1,Math.ceil(filtered.length/perPage)),visible=filtered.slice((Math.min(page,pages)-1)*perPage,Math.min(page,pages)*perPage);
 const chosen=records.find(x=>String(x.id)===String(selected));
 const change=(key,value)=>setForm(old=>({...old,[key]:value,...(key==='organization_id'?{company_id:'',branch_id:''}:key==='company_id'?{branch_id:''}:{})}));
 const begin=(type)=>{setError('');setNotice('');setForm(type==='edit'&&chosen?Object.fromEntries(Object.keys(empty).map(k=>[k,chosen[k]??''])):type==='copy'&&chosen?{...Object.fromEntries(Object.keys(empty).map(k=>[k,chosen[k]??''])),department_code:''}:{...empty});setMode(type)};
 // ===== [DEPT-VALIDATION-01 | Required Fields] =====

const validateDepartment = () => {

  if (!form.department_code.trim()) {
    return "Department Code is required.";
  }

  if (!form.department_name.trim()) {
    return "Department Name is required.";
  }

  if (!form.organization_id) {
    return "Please select an Organization.";
  }

  if (!form.company_id) {
    return "Please select a Company.";
  }

  if (!form.status) {
    return "Please select a Status.";
  }

  return "";
};
 const save=async(e)=>{e.preventDefault();setError('');setLoading(true);try{const edit=mode==='edit';const data=await call(edit?`/departments/${selected}`:'/departments',{method:edit?'PUT':'POST',body:JSON.stringify({...form,department_type_id:form.department_type_id||null})});await load();setSelected(data.id);setMode('list');setNotice(edit?'Department updated.':'Department created.')}catch(e){setError(e.message)}finally{setLoading(false)}};
 const remove=async()=>{if(!chosen||!window.confirm(`Delete department ${chosen.department_code}?`))return;setLoading(true);setError('');try{await call(`/departments/${selected}`,{method:'DELETE'});await load();setSelected(null);setNotice('Department deleted.')}catch(e){setError(e.message)}finally{setLoading(false)}};
 const view=()=>{if(!chosen)return;setForm(Object.fromEntries(Object.keys(empty).map(k=>[k,chosen[k]??''])));setMode('view');setError('')};
 const goList=()=>{setMode('list');setError('')};
 const lookupConfig={organization_id:{label:'Organization',items:organizations},company_id:{label:'Company',items:companies},branch_id:{label:'Branch',items:branches},department_type_id:{label:'Department Type',items:[]}};
  // ===== [DEPT-LOOKUP-02 | Reference-style lookup filtering and pagination] =====
  const lookupItems=lookup ? lookupConfig[lookup].items : [];
  const lookupFiltered=lookupItems.filter(x=>
    String(x.code||'').toLowerCase().includes(lookupQuery.trim().toLowerCase()) &&
    String(x.name||'').toLowerCase().includes(lookupName.trim().toLowerCase()) &&
    (!lookupStatus || String(x.status||'').toLowerCase()===lookupStatus.toLowerCase())
  );
  const lookupPages=Math.max(1,Math.ceil(lookupFiltered.length/lookupPerPage));
  const lookupCurrentPage=Math.min(lookupPage,lookupPages);
  const lookupVisible=lookupFiltered.slice((lookupCurrentPage-1)*lookupPerPage,lookupCurrentPage*lookupPerPage);
 const lookupField=(key,label,required=false)=>{
   const info=lookupConfig[key];const selected=info.items.find(x=>String(x.id)===String(form[key]));
   return <label key={key}>{label}{required?' *':''}<span className="dept-lookup-line"><input readOnly required={required} value={selected?`${selected.code ? selected.code+' - ' : ''}${selected.name}`:''} placeholder={`Type 3+ characters to search ${label}...`} /><button type="button" aria-label={`Search ${label}`} disabled={mode==='view'||(key==='company_id'&&!form.organization_id)||(key==='branch_id'&&!form.company_id)} onClick={()=>{setLookup(key);setLookupQuery('');setLookupName('');setLookupStatus('');setLookupPage(1)}}><Search size={15}/></button></span></label>
 };
 return <div className="dept-module">
  <div className="dept-toolbar">
   {mode==='list'?<><button title="Refresh Departments" onClick={()=>{setPage(1);load().catch(e=>setError(e.message))}}><Search size={15}/></button><button title="Add Department" onClick={()=>begin('add')}><FilePlus2 size={15}/></button><button title="Back to list" onClick={()=>{setSelected(null);setFilters({code:'',name:'',status:''})}}><ArrowLeft size={15}/></button>{/* ===== [DEPT-TOOLBAR-02 | Selected Row Actions] ===== */}
{chosen && (
  <>
    <button title="View" onClick={view}>
      <Eye size={15} />
    </button>

    <button title="Edit" onClick={() => begin('edit')}>
      <SquarePen size={15} />
    </button>

    <button
      title="Delete"
      disabled={loading}
      onClick={() => setShowDeleteModal(true)}
    >
      <Trash2 size={15} />
    </button>

    <button title="Copy" onClick={() => begin('copy')}>
      <Copy size={15} />
    </button>
  </>
)}{/* ===== [DEPT-DELETE-02 | Open Custom Delete Popup] ===== */}
</>:<button onClick={goList}><ArrowLeft size={15}/> Back to Departments</button>}
  </div>
  {error&&<div className="app-message" role="alert">{error}<button onClick={()=>setError('')}>×</button></div>}
  {notice&&<div className="app-message">{notice}<button onClick={()=>setNotice('')}>×</button></div>}
  {mode==='list'?<>
   <section className="org-panel summary-panel"><div className="org-section-heading"><h2>▣ Summary</h2></div><div className="details-grid"><div className="detail-item"><span>Code</span><strong>{chosen?.department_code||'—'}</strong></div><div className="detail-item"><span>Name</span><strong>{chosen?.department_name||'—'}</strong></div><div className="detail-item"><span>Status</span><strong>{chosen?.status||'—'}</strong></div></div></section>
   <section className="org-panel"><div className="org-section-heading"><h2>⌕ Search Parameters</h2></div><div className="org-list-tools"><label className="org-search-field">Department Code<input value={filters.code} onChange={e=>{setFilters({...filters,code:e.target.value});setPage(1)}}/></label><label className="org-search-field">Name<input value={filters.name} onChange={e=>{setFilters({...filters,name:e.target.value});setPage(1)}}/></label><label className="org-status-field">Status<select value={filters.status} onChange={e=>{setFilters({...filters,status:e.target.value});setPage(1)}}><option value="">Select</option><option>Active</option><option>Inactive</option></select></label></div></section>
   <section className="org-panel table-panel"><div className="org-table-wrapper"><table className="org-table"><thead><tr><th>Department Code <button className="dept-sort" onClick={()=>setSort(sort==='asc'?'desc':'asc')}>{sort==='asc'?'↑':'↓'}</button></th><th>Department Name</th><th>Organization</th><th>Company</th><th>Branch</th><th>Status</th></tr></thead><tbody>{visible.length?visible.map(x=><tr key={x.id} className={String(selected)===String(x.id)?'selected':''} onClick={()=>setSelected(x.id)} onDoubleClick={()=>{setSelected(x.id);setForm(Object.fromEntries(Object.keys(empty).map(k=>[k,x[k]??''])));setMode('view')}}><td>{x.department_code}</td><td>{x.department_name}</td><td>{x.organization_name}</td><td>{x.company_name}</td><td>{x.branch_name||'—'}</td><td><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        {/* ===== [DEPT-STATUS-02 | Active / Inactive Icons] ===== */}
        <FontAwesomeIcon
          icon={String(x.status).toLowerCase() === 'active' ? faCircleCheck : faCircleXmark}
          style={{ color: String(x.status).toLowerCase() === 'active' ? '#16a34a' : '#dc2626' }}
        />
        {x.status}
      </span></td></tr>):<tr><td colSpan="6" className="empty-table">No departments found.</td></tr>}</tbody></table></div><div className="org-pagination"><div><button disabled={page<=1} onClick={()=>setPage(1)}>|&lt;</button><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>&lt;</button><span>{Math.min(page,pages)} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>&gt;</button><button disabled={page>=pages} onClick={()=>setPage(pages)}>&gt;|</button><select value={perPage} onChange={e=>{setPerPage(Number(e.target.value));setPage(1)}}><option value="5">5</option><option value="10">10</option><option value="20">20</option></select></div></div></section>
  </>:<section className="dept-form-screen dept-three-panel-screen">
    <div className="dept-main-tab">Main Details</div>
    <h2>{mode==='view'?'View Department':mode==='edit'?'Edit Department':'New Department'}</h2>
    <form onSubmit={save} className="dept-form dept-three-panel-form">
      <div className="dept-three-panel-grid">
        {/* ===== [DEPT-PANEL-01 | General Information] ===== */}
        <div className="dept-detail-panel">
          <h3>▣ General Information</h3>
          <div className="dept-panel-fields">
            {[["department_code","Code",true],["department_name","Name",true]].map(([key,label,required])=><label key={key}>{label}{required&&' *'}<input required={required} maxLength={key==='department_code'?30:191} disabled={mode==='view'} value={form[key]} onChange={e=>change(key,e.target.value)}/></label>)}
            {lookupField('organization_id','Organization',true)}
            {lookupField('company_id','Company',true)}
          </div>
        </div>
        {/* ===== [DEPT-PANEL-02 | Department Details] ===== */}
        <div className="dept-detail-panel">
          <h3>▣ Department Details</h3>
          <div className="dept-panel-fields">
            {lookupField('branch_id','Branch')}
            {lookupField('department_type_id','Department Type')}
            {[["dept_head_id","Department Head",150],["dept_head_contact","Head Phone",50]].map(([key,label,max])=><label key={key}>{label}<input disabled={mode==='view'} maxLength={max} value={form[key]} onChange={e=>change(key,e.target.value)}/></label>)}
            <label>Status *<select disabled={mode==='view'} value={form.status} onChange={e=>change('status',e.target.value)}><option>Active</option><option>Inactive</option></select></label>
          </div>
        </div>
        {/* ===== [DEPT-PANEL-03 | Contact & Description] ===== */}
        <div className="dept-detail-panel">
          <h3>▣ Contact &amp; Description</h3>
          <div className="dept-panel-fields">
            <label>Head Email<input disabled={mode==='view'} type="email" maxLength={191} value={form.dept_head_email} onChange={e=>change('dept_head_email',e.target.value)}/></label>
            <label>Description<input disabled={mode==='view'} maxLength={255} value={form.description} onChange={e=>change('description',e.target.value)}/></label>
          </div>
        </div>
      </div>
      <div className="dept-actions">{mode!=='view'&&<button className="primary-btn" disabled={loading}>{loading?'Saving...':mode==='edit'?'Update Department':'Create Department'}</button>}<button className="secondary-btn" type="button" onClick={goList}>{mode==='view'?'Back':'Cancel'}</button></div>
    </form>
  </section>}
   {/* ===== [DEPT-LOOKUP-03 | Organization Currency-reference popup design] ===== */}
   {lookup&&<div className="dept-lookup-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setLookup('')}}>
    <div className="dept-lookup-popup" role="dialog" aria-modal="true" aria-label={`${lookupConfig[lookup].label} Lookup`}>
     <div className="dept-lookup-head"><strong>{lookupConfig[lookup].label}</strong><button type="button" aria-label="Close lookup" onClick={()=>setLookup('')}>×</button></div>
     <div className="dept-lookup-search-panel">
      <div className="dept-lookup-search-title">⌕ Search Parameters</div>
      <div className="dept-lookup-filters">
       <label>Code<input autoFocus value={lookupQuery} onChange={e=>{setLookupQuery(e.target.value);setLookupPage(1)}} /></label>
       <label>Name<input value={lookupName} onChange={e=>{setLookupName(e.target.value);setLookupPage(1)}} /></label>
       <label>Status<select value={lookupStatus} onChange={e=>{setLookupStatus(e.target.value);setLookupPage(1)}}><option value="">Select</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>
      </div>
     </div>
     <div className="dept-lookup-table-wrap"><table className="dept-lookup-table"><thead><tr><th>Code</th><th>{lookupConfig[lookup].label} Name</th><th>Status</th></tr></thead><tbody>
      {lookupVisible.map(x=><tr key={x.id} role="button" tabIndex={0} onClick={()=>{change(lookup,String(x.id));setLookup('')}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();change(lookup,String(x.id));setLookup('')}}}><td>{x.code||'—'}</td><td>{x.name}</td><td>{x.status||'—'}</td></tr>)}
      {!lookupVisible.length&&<tr><td colSpan="3" className="dept-lookup-empty">{lookup==='department_type_id'?'Department Type master API is not configured yet.':'No matching records found.'}</td></tr>}
     </tbody></table></div>
     <div className="dept-lookup-pagination"><span>⌖ Click a row to select</span><div className="dept-lookup-page-controls">
      <button type="button" disabled={lookupCurrentPage<=1} onClick={()=>setLookupPage(1)} aria-label="First page">|&lt;</button>
      <button type="button" disabled={lookupCurrentPage<=1} onClick={()=>setLookupPage(p=>Math.max(1,p-1))} aria-label="Previous page">&lt;</button>
      <span>{lookupCurrentPage} / {lookupPages}</span>
      <button type="button" disabled={lookupCurrentPage>=lookupPages} onClick={()=>setLookupPage(p=>Math.min(lookupPages,p+1))} aria-label="Next page">&gt;</button>
      <button type="button" disabled={lookupCurrentPage>=lookupPages} onClick={()=>setLookupPage(lookupPages)} aria-label="Last page">&gt;|</button>
      <span>Lines per Page</span><select aria-label="Lines per Page" value={lookupPerPage} onChange={e=>{setLookupPerPage(Number(e.target.value));setLookupPage(1)}}><option value="5">5</option><option value="10">10</option><option value="20">20</option></select>
     </div></div>
    </div>
   </div>}
    {/* ===== [DEPT-DELETE-03 | Custom Delete Confirmation Modal] ===== */}
{showDeleteModal && chosen && (
  <div className="dept-delete-overlay">
    <div
      className="dept-delete-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Delete Department"
    >
      <div className="dept-delete-warning">⚠</div>

      <h3>Delete</h3>

      <p>Do You Really Want to In-active/Delete The Record</p>

      <div className="dept-delete-actions">
        <button
          type="button"
          onClick={() => setShowDeleteModal(false)}
        >
          × No
        </button>

        <button
          type="button"
          className="dept-delete-danger"
          disabled={loading}
          onClick={() => {
            setShowDeleteModal(false);
            setNotice('');
            setError('In-Active action is not connected yet.');
          }}
        >
          In-Active
        </button>

        <button
          type="button"
          className="dept-delete-danger"
          disabled={loading}
          onClick={() => {
            setShowDeleteModal(false);
            remove();
          }}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}
 </div>;
}
