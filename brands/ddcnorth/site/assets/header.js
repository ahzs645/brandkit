const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.mobile-menu-toggle');
const servicesButton = document.querySelector('.services-trigger');
const servicesDropdown = document.querySelector('#services-dropdown');
const searchForm = document.querySelector('.site-search');
const searchInput = document.querySelector('#site-search-input');
const searchResults = document.querySelector('#site-search-results');
const searchStatus = document.querySelector('#search-status');
const searchEntries = [
  {title:'Data & insight',description:'Organize information, find the patterns, and show what matters.',href:'#service-data',terms:'data insight organization organize analysis analytics visualization dashboards research information'},
  {title:'Design & tools',description:'Interfaces, websites, workflows, and custom tools.',href:'#service-design',terms:'design interfaces websites web workflow workflows custom tools digital systems automation'},
  {title:'Connection & direction',description:'Scoping, roadmaps, and decision support.',href:'#service-connection',terms:'connection connect direction planning strategy scoping roadmap roadmaps decision support project'},
  {title:'What we do',description:'Data, design, and connection.',href:'#services',terms:'services what we do capabilities disciplines'},
  {title:'Our approach',description:'Discover, develop, and deliver.',href:'#approach',terms:'approach process discover develop deliver how work'},
  {title:'About DDCNorth',description:'Meet Amir, Ahmad, and Fryderyk.',href:'#about',terms:'about ddcnorth team people amir ahmad fryderyk fred'},
  {title:'Contact us',description:'Start a conversation about your next project.',href:'#contact',terms:'contact email talk conversation project fryderyk ddcnorth.com'}
];
let matches = [];
function closeServices(){servicesButton.setAttribute('aria-expanded','false');servicesDropdown.hidden=true;}
function closeSearch(){searchResults.hidden=true;searchInput.setAttribute('aria-expanded','false');searchStatus.textContent='';}
function closeMenu(){menuButton.setAttribute('aria-expanded','false');header.classList.remove('is-menu-open');closeServices();closeSearch();}
function renderSearch(){
  const query=searchInput.value.trim().toLowerCase();
  if(!query){closeSearch();return;}
  closeServices();
  const words=query.split(/\s+/);
  matches=searchEntries.filter(entry=>words.every(word=>(entry.title+' '+entry.description+' '+entry.terms).toLowerCase().includes(word)));
  searchResults.replaceChildren();
  if(matches.length){
    const list=document.createElement('ul');
    matches.forEach(entry=>{
      const item=document.createElement('li');
      const link=document.createElement('a');
      link.href=entry.href;
      const title=document.createElement('strong');title.textContent=entry.title;
      const description=document.createElement('span');description.textContent=entry.description;
      link.append(title,description);item.append(link);list.append(item);
    });
    searchResults.append(list);
  }else{
    const message=document.createElement('p');message.className='search-empty';message.textContent='No matching sections. Try “data”, “websites”, or “contact”.';searchResults.append(message);
  }
  searchResults.hidden=false;searchInput.setAttribute('aria-expanded','true');
  searchStatus.textContent=matches.length ? matches.length+' matching '+(matches.length===1?'section':'sections')+'. Press Tab to explore results.':'No matching sections.';
}
menuButton.addEventListener('click',()=>{
  const open=menuButton.getAttribute('aria-expanded')!=='true';
  closeMenu();menuButton.setAttribute('aria-expanded',String(open));header.classList.toggle('is-menu-open',open);
});
servicesButton.addEventListener('click',()=>{
  const open=servicesButton.getAttribute('aria-expanded')!=='true';
  closeSearch();servicesButton.setAttribute('aria-expanded',String(open));servicesDropdown.hidden=!open;
});
searchInput.addEventListener('input',renderSearch);
searchInput.addEventListener('focus',renderSearch);
searchInput.addEventListener('keydown',event=>{
  if(event.key==='ArrowDown'&&!searchResults.hidden){event.preventDefault();searchResults.querySelector('a')?.focus();}
});
searchForm.addEventListener('submit',event=>{
  event.preventDefault();renderSearch();
  if(matches.length&&searchInput.value.trim())searchResults.querySelector('a')?.click();
});
header.addEventListener('click',event=>{
  const link=event.target.closest('a');
  if(link)closeMenu();
});
document.addEventListener('click',event=>{if(!header.contains(event.target))closeMenu();});
document.addEventListener('focusin',event=>{if(!header.contains(event.target)){closeServices();closeSearch();}});
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  if(!searchResults.hidden){closeSearch();searchInput.focus();}
  else if(!servicesDropdown.hidden){closeServices();servicesButton.focus();}
  else if(menuButton.getAttribute('aria-expanded')==='true'){closeMenu();menuButton.focus();}
});
window.matchMedia('(max-width:900px)').addEventListener('change',closeMenu);
