/* e-Calendar panel 0.9.6. No external dependencies or cloud requests. */
class ECalendarPanel extends HTMLElement {
  set hass(value) { this._hass = value; if (this.isConnected) this.start(); }
  connectedCallback() { this.start(); }
  disconnectedCallback() { clearInterval(this.timer); this.timer = null; }
  start() {
    if (!this._hass) return;
    if (!this.shadowRoot) this.build();
    this.toggleAttribute("ec-dark", Boolean(this._hass.themes?.darkMode));
    if (!this.timer) {
      this.poll();
      this.timer = setInterval(() => { if (!document.hidden) this.poll(); }, 4000);
    }
  }
  build() {
    const root = this.attachShadow({mode: 'open'});
    root.innerHTML = `<style>
      :host{display:block;height:100%;overflow:auto;background:var(--primary-background-color,#f4f6f9);color:var(--primary-text-color,#183149);font:16px Arial,sans-serif}
      *{box-sizing:border-box}header{display:flex;align-items:center;gap:14px;padding:12px 20px;background:var(--card-background-color,white);border-bottom:1px solid var(--divider-color,#ddd)}
      header strong{font-size:22px}header em{color:#c31635;font-style:normal}dl{display:grid;grid-template-columns:minmax(130px,1fr) 2fr;gap:12px}dt{color:var(--secondary-text-color)}dd{margin:0;overflow-wrap:anywhere}main{max-width:1000px;margin:24px auto;padding:0 20px 40px}
      section{background:var(--card-background-color,white);border-radius:14px;padding:24px;margin:18px 0;border:1px solid var(--divider-color,#dde3eb)}
      h2{margin:0 0 18px;font-size:21px}p{line-height:1.5}label{display:block;font-size:14px;margin:0 0 7px}
      input,select{width:100%;padding:11px;border:1px solid var(--divider-color,#bdc8d5);border-radius:7px;background:var(--card-background-color,white);color:inherit;font:inherit}
      [hidden]{display:none!important}.options{margin-top:18px}.check{display:flex;align-items:center;gap:10px}.check input{width:auto}.fields{display:grid;grid-template-columns:2fr 1fr 1fr;gap:16px}.bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.bar input{flex:1;min-width:180px}
      button{border:0;background:var(--primary-color,#1463ba);color:white;border-radius:8px;padding:11px 18px;font:inherit;cursor:pointer}button:disabled{opacity:.5;cursor:wait}
      .remove{background:#bd1737;padding:9px 14px}
      .note{font-size:14px;color:var(--secondary-text-color,#647a90)}#feedback{margin:12px 0;line-height:1.5}#feedback:empty{margin:0}.device-settings h2{font-size:17px}.device-settings{margin-top:28px}#feedback.error{color:#c31635}
      .event{display:grid;grid-template-columns:130px 1fr auto;gap:16px;align-items:center;padding:18px 0;border-top:1px solid var(--divider-color,#dde3eb)}
      .date{color:var(--primary-color,#1463ba);font-weight:bold}.name{font-weight:bold;overflow-wrap:anywhere}.details{margin-top:6px;font-size:14px;color:var(--secondary-text-color,#647a90)}
      #devices{max-width:330px}#count{font-size:14px;font-weight:normal;margin-left:10px}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--primary-color,#1463ba);outline-offset:3px}
      .tabs{display:flex;gap:8px;margin:16px 0;border-bottom:1px solid var(--divider-color,#dde3eb);padding-bottom:12px}.tabs button{background:transparent;color:var(--secondary-text-color,#647a90)}.tabs button[aria-selected="true"]{background:var(--primary-color,#1463ba);color:white}
      .home-grid{display:grid;grid-template-columns:280px 1fr;gap:20px;align-items:stretch}.home-grid section{margin:0}.day-card{text-align:center}.day-card #home-day{font-size:112px;font-weight:600;line-height:1.1;letter-spacing:-5px;color:var(--primary-color,#1463ba);margin:12px 0}.day-card #home-weekday{font-size:22px;font-weight:bold}.day-card #home-month{font-size:19px;text-transform:capitalize}
      .sensors{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.sensor{display:block;text-align:left;background:var(--card-background-color,white);color:inherit;padding:18px;border:1px solid var(--divider-color,#dde3eb);border-radius:12px}.sensor:not(:disabled):hover{border-color:var(--primary-color,#1463ba);background:var(--secondary-background-color,#f1f4f8)}.sensor:disabled{opacity:1;cursor:default}.sensor-link{display:block;font-size:12px;color:var(--primary-color,#1463ba);margin-top:10px}.sensor:disabled .sensor-link{color:var(--secondary-text-color,#647a90)}.sensor-label{font-size:14px;color:var(--secondary-text-color,#647a90);min-height:36px;line-height:1.3}.sensor-value{font-size:30px;font-weight:600;margin:10px 0;white-space:nowrap}.sensor-unit{font-size:14px;font-weight:normal;margin-left:5px}.sensor-note{font-size:12px;color:var(--secondary-text-color,#647a90);line-height:1.4;min-height:34px}
      .upcoming-row{display:grid;grid-template-columns:120px 1fr;gap:16px;padding:14px 0;border-top:1px solid var(--divider-color,#dde3eb)}.upcoming-names{display:flex;flex-direction:column;gap:8px;overflow-wrap:anywhere}.section-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.section-bar h2{margin:0}.section-bar button{font-size:14px;background:transparent;color:var(--primary-color,#1463ba);padding:6px 0}
      @media(max-width:850px){.home-grid{grid-template-columns:220px 1fr}.sensors{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:650px){.home-grid{grid-template-columns:1fr}.day-card #home-day{font-size:90px}.sensor-value{font-size:26px}.upcoming-row{grid-template-columns:100px 1fr}}
      @media(max-width:650px){main{padding:0 12px}.fields{grid-template-columns:1fr}section{padding:18px}.event{grid-template-columns:1fr auto;gap:10px}.date{grid-column:1 / -1}}
      .event-views{display:flex;gap:8px;margin:16px 0}.event-views button[aria-pressed="false"]{background:transparent;color:var(--primary-color,#1463ba);border:1px solid var(--divider-color,#ddd)}
      .month-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px}.month-toolbar h2{margin:0;text-transform:capitalize}.month-scroll{overflow-x:auto}.month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));min-width:560px;border-top:1px solid var(--divider-color,#ddd);border-left:1px solid var(--divider-color,#ddd)}
      .month-head{text-align:center;font-size:12px;font-weight:bold;padding:10px 4px;border-right:1px solid var(--divider-color,#ddd);border-bottom:1px solid var(--divider-color,#ddd)}.month-week{grid-column:1 / -1;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));min-height:100px}.month-cell{cursor:pointer;min-height:0;min-width:0;padding:5px;border-right:1px solid var(--divider-color,#ddd);border-bottom:1px solid var(--divider-color,#ddd)}.month-cell.outside{background:var(--secondary-background-color,#eee)}.month-day{background:transparent;color:inherit;padding:4px 8px;font-size:14px;display:block;margin-bottom:5px}.month-cell.outside .month-day{color:var(--secondary-text-color,#888)}.month-day.today{background:var(--primary-color,#1463ba);color:white;border-radius:50%}.month-event{z-index:1;align-self:start;display:block;width:100%;text-align:left;padding:5px 6px;margin:4px 0;font-size:12px;line-height:1.35;overflow-wrap:anywhere}.month-detail{padding:12px;margin-top:12px;border:1px solid var(--divider-color,#ddd);border-radius:8px;line-height:1.5;white-space:pre-line}
      dialog{background:var(--card-background-color,white);color:inherit;border:1px solid var(--divider-color,#ddd);border-radius:16px;padding:24px;width:min(680px,calc(100vw - 24px));max-height:calc(100dvh - 40px);overflow:auto;box-shadow:0 12px 48px #0006}dialog::backdrop{background:#0008}dialog h2{margin:0}.dialog-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px}.dialog-heading button{background:transparent;color:inherit;font-size:24px;padding:4px 10px}.dialog-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:20px}#dialog-feedback:empty{display:none}#dialog-feedback{line-height:1.5;margin-top:15px}#dialog-feedback.error{color:#c31635}.event-actions{display:flex;justify-content:flex-end;margin:16px 0 20px}.time-fields{margin:18px 0}.time-fields input[type=time]{max-width:180px}#dialog-target{margin:0 0 18px}
    header img{display:block;flex-shrink:0;width:220px;max-width:100%;height:auto;object-fit:contain}header .ec-logo-dark{display:none}:host([ec-dark]) header .ec-logo-light{display:none}:host([ec-dark]) header .ec-logo-dark{display:block}
    </style><header><img class="ec-logo-light" src="/ecalendar_static/ecalendar-logo-light.png?v=0.9.6" alt="eCalendar" width="220" height="34"><img class="ec-logo-dark" src="/ecalendar_static/ecalendar-logo-dark.png?v=0.9.6" alt="eCalendar" width="220" height="34"></header>
    <main><nav class="tabs" role="tablist" aria-label="Panel kalendarza"><button id="tab-start" role="tab" aria-selected="true" aria-controls="view-start" tabindex="0">Start</button><button id="tab-events" role="tab" aria-selected="false" aria-controls="view-events" tabindex="-1">Wydarzenia</button><button id="tab-device" role="tab" aria-selected="false" aria-controls="view-device" tabindex="-1">Urządzenie</button></nav>
    <div id="feedback" role="status" aria-live="polite"></div>
    <div class="bar"><select id="devices" aria-label="Kalendarz"></select><span id="simple-status" role="status"></span><button id="refresh-home">Odśwież</button></div><div id="view-start" role="tabpanel" aria-labelledby="tab-start">
    <div class="home-grid"><section class="day-card" aria-label="Aktualna data"><div id="home-month"></div><div id="home-day"></div><div id="home-weekday"></div><p id="home-date-note" class="note"></p></section>
    <section><div class="section-bar"><h2>Nadchodzące wydarzenia</h2><button id="show-events">Zobacz wszystkie →</button></div><p class="note">Własne wydarzenia z trzech najbliższych dat — wszystkie wpisy pod wspólną datą.</p><div id="upcoming"></div></section></div>
    <section><h2>Pomiary w pomieszczeniu</h2><div class="sensors">
    <button type="button" id="sensor-card-temperature" class="sensor" disabled><div class="sensor-label">Temperatura</div><div class="sensor-value"><span id="sensor-temperature">—</span><span class="sensor-unit">°C</span></div><div id="sensor-note-temperature" class="sensor-note"></div><span class="sensor-link" id="sensor-link-temperature">Oczekiwanie na encję HA</span></button>
    <button type="button" id="sensor-card-humidity" class="sensor" disabled><div class="sensor-label">Wilgotność</div><div class="sensor-value"><span id="sensor-humidity">—</span><span class="sensor-unit">%</span></div><div id="sensor-note-humidity" class="sensor-note"></div><span class="sensor-link" id="sensor-link-humidity">Oczekiwanie na encję HA</span></button>
    <button type="button" id="sensor-card-pressure_sealevel" class="sensor" disabled><div class="sensor-label">Ciśnienie na poziomie morza</div><div class="sensor-value"><span id="sensor-pressure_sealevel">—</span><span class="sensor-unit">hPa</span></div><div id="sensor-note-pressure_sealevel" class="sensor-note"></div><span class="sensor-link" id="sensor-link-pressure_sealevel">Oczekiwanie na encję HA</span></button>
    <button type="button" id="sensor-card-pressure" class="sensor" disabled><div class="sensor-label">Ciśnienie lokalne</div><div class="sensor-value"><span id="sensor-pressure">—</span><span class="sensor-unit">hPa</span></div><div id="sensor-note-pressure" class="sensor-note"></div><span class="sensor-link" id="sensor-link-pressure">Oczekiwanie na encję HA</span></button>
    </div><p class="note">Pomiary są aktualizowane co minutę. Po restarcie HA pierwsze wartości mogą pojawić się po około minucie. Ciśnienie na poziomie morza wymaga ustawionej wysokości lokalizacji w kalendarzu.</p></section>
    </div><div id="view-events" role="tabpanel" aria-labelledby="tab-events" hidden>
    <div class="event-actions"><button id="open-add">+ Dodaj wydarzenie</button></div>
    <div class="event-views" role="group" aria-label="Widok wydarzeń"><button id="mode-list" aria-pressed="true">Lista</button><button id="mode-month" aria-pressed="false">Miesiąc</button></div>
    <section id="month-view" hidden><div class="month-toolbar"><div class="bar"><button id="month-today">Dzisiaj</button><button id="month-prev" aria-label="Poprzedni miesiąc">‹</button><button id="month-next" aria-label="Następny miesiąc">›</button></div><h2 id="month-title"></h2></div><p id="month-status" class="note"></p><div class="month-scroll"><div id="month-grid" class="month-grid"></div></div><div id="month-detail" class="month-detail" role="status" hidden></div><p class="note">Kliknij dzień, aby od razu dodać wydarzenie. Kliknij pasek wydarzenia, aby zobaczyć szczegóły lub je edytować. Kalendarz pokazuje daty wydarzeń, bez dni wcześniejszego przypomnienia.</p></section>
    <dialog id="add-dialog" aria-labelledby="add-title"><div class="dialog-heading"><h2 id="add-title">Dodaj wydarzenie</h2><button type="button" id="close-add" aria-label="Zamknij">×</button></div><p class="note" id="dialog-target"></p><form id="form"><div class="fields">
    <div><label for="name">Nazwa wydarzenia</label><input id="name" required maxlength="160" placeholder="np. Wizyta u weterynarza"></div>
    <div id="event-date-field"><label id="event-date-label" for="date">Początek — data</label><input id="date" type="date" min="2000-01-01" max="2099-12-31" required></div>
    <div><label for="end-date">Koniec — data</label><input id="end-date" type="date" min="2000-01-01" max="2099-12-31"><p class="note">Pozostaw puste, jeśli wydarzenie kończy się tego samego dnia.</p></div>
    <div><label for="advance">Wyświetlaj wcześniej</label><select id="advance"></select></div></div>
    <div class="time-fields"><label class="check" for="all-day"><input id="all-day" type="checkbox" checked> Wydarzenie całodniowe</label><div id="time-wrapper" hidden><label for="event-time">Początek — godzina</label><input id="event-time" type="time" step="60" disabled><label for="end-time">Koniec — godzina</label><input id="end-time" type="time" step="60" disabled><p class="note">Godziny mogą uruchamiać automatyzacje HA. Ekran e-paper pokazuje wydarzenie według dat i nie odświeża się o każdej podanej godzinie.</p></div></div>
    <div class="options"><label for="repeat">Powtarzanie</label><select id="repeat">
    <option value="0">Brak — jednorazowo</option><option value="1">Co tydzień</option><option value="2">Co miesiąc</option><option value="3">Co rok</option><option value="4">Wybrany dzień tygodnia w miesiącu</option></select></div>
    <div id="monthly" class="options fields" hidden><div><label for="occurrence">Który w miesiącu</label><select id="occurrence">
    <option value="1">Pierwszy</option><option value="2">Drugi</option><option value="3">Trzeci</option><option value="4">Czwarty</option><option value="5">Ostatni</option></select></div>
    <div><label for="weekday">Dzień tygodnia</label><select id="weekday"><option value="1">Poniedziałek</option><option value="2">Wtorek</option><option value="3">Środa</option><option value="4">Czwartek</option><option value="5">Piątek</option><option value="6">Sobota</option><option value="0">Niedziela</option></select></div></div>
    <div id="annual" class="options" hidden><label class="check" for="anniversary"><input id="anniversary" type="checkbox"> Urodziny / rocznica — zwiększaj liczbę o 1 co rok</label>
    <div id="anniversary-value" hidden><label for="anniversary-base">Wiek / numer rocznicy w roku początkowym</label><input id="anniversary-base" type="number" min="0" max="250" step="1" value="0">
    <p class="note">Np. data 07.10.2026 i wartość 40 oznacza 40 w 2026 roku oraz 41 w 2027 roku. Możesz też podać datę urodzenia lub ślubu i wartość 0, jeśli data mieści się w latach 2000–2099.</p></div></div>
    <div id="short-month-option" class="options" hidden><label class="check"><input id="short-month" type="checkbox"> W krótszych miesiącach przypominaj w ostatnim dniu miesiąca</label></div>
    <p class="note" id="repeat-help"></p>
    <div id="dialog-feedback" role="status" aria-live="polite"></div><div class="dialog-actions"><button id="cancel-add" type="button">Anuluj</button><button id="add" type="submit">Dodaj do kalendarza</button></div></form></dialog>
    <section id="list-view"><h2>Twoje wydarzenia <span id="count"></span></h2><div class="bar"><input id="search" type="search" placeholder="Szukaj wydarzenia…" aria-label="Szukaj wydarzenia"></div><div id="events"></div></section>
    </div><div id="view-device" role="tabpanel" aria-labelledby="tab-device" hidden><section><h2>Urządzenie</h2><dl id="device-details"></dl><div class="bar"><button id="refresh">Pobierz wydarzenia</button><button id="refresh-data">Odśwież dane panelu</button></div><p class="note" id="connection"></p><p class="note">Odświeżenie danych panelu pobiera bieżące dane z Home Assistant. Pomiary kalendarz przesyła automatycznie co minutę.</p></section></div><p class="note">Wydarzenia są zapisane w kalendarzu i działają również po wyłączeniu Home Assistant. Odświeżenie ekranu e-paper może potrwać około 30 sekund.</p></main>`;
    this.el = id => root.getElementById(id);
    for(const key of ['temperature','humidity','pressure','pressure_sealevel'])this.el('sensor-card-'+key).onclick=()=>this.openSensor(key);
    this.activeTab='start';this.eventView='list';this.monthCursor=this.today();
    this.el('mode-list').onclick=()=>this.showEventView('list');this.el('mode-month').onclick=()=>this.showEventView('month');
    this.el('month-prev').onclick=()=>this.moveMonth(-1);this.el('month-next').onclick=()=>this.moveMonth(1);
    this.el('month-today').onclick=()=>{this.monthCursor=this.today();this.renderMonth();};
    this.el('tab-start').onclick=()=>this.showTab('start');this.el('tab-events').onclick=()=>this.showTab('events');this.el('tab-device').onclick=()=>this.showTab('device');
    this.el('show-events').onclick=()=>this.showTab('events');
    for(const name of ['start','events','device'])this.el('tab-'+name).onkeydown=event=>{
      if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const tabs=['start','events','device'],i=tabs.indexOf(this.activeTab);const target=event.key==='Home'?'start':event.key==='End'?'device':tabs[(i+(event.key==='ArrowRight'?1:2))%3];this.showTab(target);this.el('tab-'+target).focus();}
    };
    for(let n=0;n<=7;n++){const option=document.createElement('option');option.value=n;option.textContent=n?`${n} dni wcześniej`:'W dniu wydarzenia';this.el('advance').append(option);}
    const today=this.today();this.el('date').value=`${today.year}-${String(today.month).padStart(2,'0')}-${String(today.day).padStart(2,'0')}`;
    this.el('devices').onchange=()=>this.render();this.el('search').oninput=()=>this.renderEvents();
    this.el('refresh').onclick=()=>this.act('refresh',{});this.el('refresh-home').onclick=()=>this.act('refresh',{});this.el('refresh-data').onclick=()=>this.poll();
    this.el('repeat').onchange=()=>this.updateOptions();this.el('short-month').onchange=()=>this.updateOptions();this.el('anniversary').onchange=()=>this.updateOptions();this.updateOptions();
    this.el('open-add').onclick=()=>this.openAdd();
    this.el('close-add').onclick=()=>this.closeAdd();this.el('cancel-add').onclick=()=>this.closeAdd();
    this.el('add-dialog').addEventListener('cancel',event=>{if(this.busy)event.preventDefault();});
    this.el('all-day').onchange=()=>this.updateTime();this.updateTime();
    this.el('form').onsubmit=event=>{event.preventDefault();try{this.act(this._ecalendarEventEdit?'update':'add',{...this.formPayload(),...(this._ecalendarEventEdit||{})});}catch(error){this.feedback(error.message,true);}};
  }
  showTab(tab){
    this.activeTab=tab;
    for(const name of ['start','events','device']){
      const selected=name===tab;this.el('view-'+name).hidden=!selected;
      this.el('tab-'+name).setAttribute('aria-selected',String(selected));this.el('tab-'+name).tabIndex=selected?0:-1;
    }
  }
  openAdd(date){
    const device=this.selected();if(!device||this.busy||device.busy)return;
    if(this._ecalendarEventEdit)this.el('form').reset?.();
    this._ecalendarEventEdit=null;this.el('add-title').textContent='Dodaj wydarzenie';this.el('add').textContent='Dodaj do kalendarza';
    this.dialogEntryId=device.entry_id;
    this.el('dialog-target').textContent='Kalendarz: '+device.title;
    if(date){this.el('end-date').value='';this.el('date').value=`${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}`;}
    this.el('dialog-feedback').textContent='';this.updateTime();this.updateOptions();
    this.el('add-dialog').showModal();this.el('name').focus();
  }
  openEdit(event){
    const d=this.selected();if(!d?.state?.supports_update){this.feedback('Najpierw zaktualizuj firmware kalendarza, aby edytować wydarzenia.',true);return;}
    if(this.busy||d.busy)return;
    try {
    this.dialogEntryId=d.entry_id;
    this.el('dialog-target').textContent='Kalendarz: '+d.title;
    this.el('dialog-feedback').textContent='';
    this._ecalendarEventEdit={index:event.index,revision:d.state.revision};
    this.el('add-title').textContent='Edytuj wydarzenie';this.el('add').textContent='Zapisz zmiany';
    const iso=x=>`${x.year}-${String(x.month).padStart(2,'0')}-${String(x.day).padStart(2,'0')}`;
    this.el('name').value=event.name;this.el('date').value=iso(event);this.el('advance').value=String(event.advance_days);this.el('repeat').value=String(event.repeat||0);this.el('occurrence').value=String(event.monthly_occurrence||1);this.el('weekday').value=String(event.monthly_weekday??1);this.el('anniversary').checked=!!event.anniversary;this.el('short-month').checked=event.short_month_last_day===true;this.el('anniversary-base').value=event.anniversary_base||0;
    this.el('all-day').checked=!(event.time_minutes>=0);this.el('event-time').value=this.timeLabel(event);
    let end=this.shiftDate(event,event.end_days||0),minutes=event.end_time_minutes??-1;
    if(event.time_minutes>=0&&minutes<0){minutes=(event.time_minutes+1)%1440;if(minutes===0)end=this.shiftDate(end,1);}
    this.el('end-date').value=iso(end);this.el('end-time').value=minutes>=0?this.timeLabel({time_minutes:minutes}):'';
    this.updateTime();this.updateOptions();
    if(!this.el('add-dialog').open)this.el('add-dialog').showModal();
    this.el('name').focus();
    } catch(error) {
      this._ecalendarEventEdit=null;
      if(this.el('add-dialog').open)this.el('add-dialog').close();
      this.feedback('Nie udało się otworzyć edycji: '+(error.message||String(error)),true);
    }
  }
  closeAdd(){if(this.busy)return;this.el('add-dialog').close();}
  updateTime(){
    const allDay=this.el('all-day').checked;
    this.el('time-wrapper').hidden=allDay;for(const id of ['event-time','end-time']){this.el(id).disabled=allDay;this.el(id).required=!allDay;}
  }
  timeLabel(event){
    const minutes=event.time_minutes;
    return Number.isInteger(minutes)&&minutes>=0&&minutes<=1439?`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`:'';
  }
  sensorEntity(key){
    const entityId=this.selected()?.entities?.[key];
    return typeof entityId==='string'&&entityId.startsWith('sensor.')&&this._hass?.states?.[entityId]?entityId:null;
  }
  openSensor(key){
    const entityId=this.sensorEntity(key);if(!entityId)return;
    this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId},bubbles:true,composed:true}));
  }
  showEventView(view){
    this.eventView=view;this.el('month-view').hidden=view!=='month';this.el('list-view').hidden=view!=='list';
    for(const name of ['list','month'])this.el('mode-'+name).setAttribute('aria-pressed',String(view===name));
    this.renderMonth();
  }
  moveMonth(delta){
    const value=new Date(Date.UTC(this.monthCursor.year,this.monthCursor.month-1+delta,1));
    if(value.getUTCFullYear()<2000||value.getUTCFullYear()>2099)return;
    this.monthCursor={year:value.getUTCFullYear(),month:value.getUTCMonth()+1,day:1};this.renderMonth();
  }
  shiftDate(value,days){const d=new Date(Date.UTC(value.year,value.month-1,value.day+days));return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate()};}
  activeOccurrence(event,date){
    let last=event.end_days||0;if(event.time_minutes>=0&&event.end_time_minutes===0)last--;
    for(let back=0;back<=last;back++){
      const candidate=this.shiftDate(date,-back),start=this.nextOccurrence(event,candidate);
      if(start&&this.formatDate(start)===this.formatDate(candidate))return start;
    }
    return null;
  }
  rangeLabel(event,start){
    const begin=start||event,end=this.shiftDate(begin,event.end_days||0),minutes=event.end_time_minutes;
    const hour=Number.isInteger(minutes)&&minutes>=0?this.timeLabel({time_minutes:minutes}):'';
    if(event.end_days>0){
      const last=event.time_minutes>=0&&minutes===0?this.shiftDate(end,-1):end;
      const month=x=>new Intl.DateTimeFormat('pl-PL',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(x.year,x.month-1,x.day)));
      // Intl standalone month -> Polish date grammatical form.
      const withMonth=x=>new Intl.DateTimeFormat('pl-PL',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(x.year,x.month-1,x.day)));
      const same=begin.year===last.year&&begin.month===last.month;
      let label=same?`${begin.day}–${withMonth(last)}`:`${withMonth(begin)}${begin.year!==last.year?' '+begin.year:''} – ${withMonth(last)}${begin.year!==last.year?' '+last.year:''}`;
      return ' · '+label+(hour?' (koniec '+this.formatDate(end)+' '+hour+')':'');
    }
    return minutes>=0?' → '+hour:'';
  }
  weekSegments(cells){
    const segments=new Map();
    cells.forEach((cell,column)=>cell.events.forEach(event=>{
      const start=this.activeOccurrence(event,cell.date),key=event.index+':'+JSON.stringify(event)+':'+this.formatDate(start);
      if(!segments.has(key))segments.set(key,{event,start,first:column,last:column});else segments.get(key).last=column;
    }));
    const result=[...segments.values()].sort((a,b)=>a.first-b.first||b.last-a.last),lanes=[];
    for(const segment of result){let lane=lanes.findIndex(last=>last<segment.first);if(lane<0)lane=lanes.length;lanes[lane]=segment.last;segment.lane=lane;}
    return result;
  }
  monthCells(year,month,events){
    const first=new Date(Date.UTC(year,month-1,1)),offset=(first.getUTCDay()+6)%7;
    return Array.from({length:42},(_,i)=>{
      const value=new Date(Date.UTC(year,month-1,1-offset+i));
      const date={year:value.getUTCFullYear(),month:value.getUTCMonth()+1,day:value.getUTCDate()};
      const matches=events.filter(event=>this.activeOccurrence(event,date));
      return {date,events:matches,outside:date.month!==month};
    });
  }
  renderMonth(){
    if(this.eventView!=='month')return;
    const device=this.selected(),state=device?.state,today=this.today(),cursor=this.monthCursor;
    // Keep focus and the expanded detail while unchanged MQTT snapshots are polled.
    const signature=JSON.stringify([device?.entry_id,state?.revision,state?.events,cursor.year,cursor.month,today]);
    if(signature===this.monthSignature)return;this.monthSignature=signature;
    this.el('month-detail').hidden=true;
    this.el('month-title').textContent=new Intl.DateTimeFormat('pl-PL',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(cursor.year,cursor.month-1,1)));
    this.el('month-prev').disabled=cursor.year===2000&&cursor.month===1;this.el('month-next').disabled=cursor.year===2099&&cursor.month===12;
    this.el('month-status').textContent=state?'Wydarzenia zapisane w wybranym kalendarzu.':'Oczekiwanie na wydarzenia z kalendarza.';
    const grid=this.el('month-grid');grid.replaceChildren();
    for(const name of ['Pon.','Wt.','Śr.','Czw.','Pt.','Sob.','Niedz.']){const head=document.createElement('div');head.className='month-head';head.textContent=name;grid.append(head);}
    const cells=this.monthCells(cursor.year,cursor.month,state?.events||[]);
    for(let offset=0;offset<42;offset+=7){
      const days=cells.slice(offset,offset+7),segments=this.weekSegments(days),week=document.createElement('div');week.className='month-week';
      const lanes=segments.length?Math.max(...segments.map(s=>s.lane))+1:1;week.style.gridTemplateRows='36px '+Array(lanes).fill('minmax(28px,auto)').join(' ');
      days.forEach((cell,column)=>{
        const box=document.createElement('div');box.className='month-cell'+(cell.outside?' outside':'');box.style.gridColumn=String(column+1);box.style.gridRow='1 / span '+(lanes+1);box.onclick=()=>{if(cell.date.year>=2000&&cell.date.year<=2099)this.openAdd(cell.date);};
        const day=document.createElement('button');day.className='month-day'+(this.formatDate(cell.date)===this.formatDate(today)?' today':'');day.textContent=cell.date.day;day.setAttribute('aria-label','Dodaj wydarzenie na dzień: '+this.formatDate(cell.date));day.disabled=cell.date.year<2000||cell.date.year>2099;day.onclick=event=>{event?.stopPropagation?.();this.openAdd(cell.date);};box.append(day);week.append(box);
      });
      for(const segment of segments){const button=document.createElement('button');button.className='month-event';button.style.gridColumn=(segment.first+1)+' / span '+(segment.last-segment.first+1);button.style.gridRow=String(segment.lane+2);button.textContent=this.eventName(segment.event,segment.start.year);button.title=this.describe(segment.event)+this.rangeLabel(segment.event,segment.start);button.onclick=()=>this.showDay(days[segment.first]);week.append(button);}
      grid.append(week);
    }
  }

  upcomingGroups(events,today){
    const number=value=>Date.UTC(value.year,value.month-1,value.day);
    const groups=new Map(),now=number(today);
    for(const event of events){
      const active=this.activeOccurrence(event,today),next=active?today:this.nextOccurrence(event,today);if(!next||number(next)<now)continue;
      const key=number(next);if(!groups.has(key))groups.set(key,{date:next,events:[]});groups.get(key).events.push(event);
    }
    return [...groups.entries()].sort((a,b)=>a[0]-b[0]).slice(0,3).map(([,group])=>group);
  }
  renderHome(){
    const today=this.today(),civil=new Date(Date.UTC(today.year,today.month-1,today.day));
    this.el('home-month').textContent=new Intl.DateTimeFormat('pl-PL',{month:'long',year:'numeric',timeZone:'UTC'}).format(civil);
    this.el('home-day').textContent=today.day;
    const weekday=new Intl.DateTimeFormat('pl-PL',{weekday:'long',timeZone:'UTC'}).format(civil);
    this.el('home-weekday').textContent=weekday[0].toLocaleUpperCase('pl')+weekday.slice(1);
    this.el('home-date-note').textContent=`${this.formatDate(today)} • Ten miesiąc ma ${new Date(Date.UTC(today.year,today.month,0)).getUTCDate()} dni`;
    const device=this.selected(),container=this.el('upcoming');container.replaceChildren();
    if(!device?.state){const p=document.createElement('p');p.className='note';p.textContent='Oczekiwanie na wydarzenia z kalendarza.';container.append(p);}
    else{
      const groups=this.upcomingGroups(device.state.events,today);
      if(!groups.length){const p=document.createElement('p');p.className='note';p.textContent='Brak nadchodzących wydarzeń.';container.append(p);}
      for(const group of groups){
        const row=document.createElement('div');row.className='upcoming-row';const date=document.createElement('div');date.className='date';date.textContent=this.formatDate(group.date);
        const names=document.createElement('div');names.className='upcoming-names';
        for(const event of group.events){const name=document.createElement('div');name.className='name';const start=this.activeOccurrence(event,group.date)||group.date;name.textContent=this.eventName(event,start.year)+this.rangeLabel(event,start);names.append(name);}
        row.append(date,names);container.append(row);
      }
    }
    for(const key of ['temperature','humidity','pressure','pressure_sealevel']){
      const reading=device?.measurements?.[key],entityId=this.sensorEntity(key),card=this.el('sensor-card-'+key);
      card.disabled=!entityId;card.title=entityId?'Otwórz encję '+entityId:'Nie znaleziono aktywnej encji tego czujnika w HA';
      this.el('sensor-link-'+key).textContent=entityId?'Historia i szczegóły ↗':'Encja HA niedostępna';
      const valid=reading?.status==='ok'&&typeof reading.value==='number'&&Number.isFinite(reading.value);
      this.el('sensor-'+key).textContent=valid?new Intl.NumberFormat('pl-PL',{minimumFractionDigits:1,maximumFractionDigits:1}).format(reading.value):'—';
      const statuses={waiting:'Oczekiwanie na pierwszy pomiar',offline:'Pomiar niedostępny',stale:'Brak świeżych danych',invalid:'Nieprawidłowy odczyt'};
      this.el('sensor-note-'+key).textContent=valid?`Ostatni pomiar: ${reading.age_seconds<60?reading.age_seconds+' s':Math.floor(reading.age_seconds/60)+' min'} temu`:statuses[reading?.status]||'Oczekiwanie na pierwszy pomiar';
    }
  }
  updateOptions(){
    const repeat=Number(this.el('repeat').value),annual=repeat===3;
    const dateField=this.el('event-date-field');
    if(dateField)dateField.hidden=repeat===4;
    this.el('date').required=repeat!==4;
    if(repeat===4&&!this._ecalendarEventEdit){const today=this.today();this.el('date').value=`${today.year}-${String(today.month).padStart(2,'0')}-${String(today.day).padStart(2,'0')}`;}
    this.el('short-month-option').hidden=![2,3].includes(repeat);this.el('short-month').disabled=![2,3].includes(repeat);if(![2,3].includes(repeat))this.el('short-month').checked=false;
    this.el('monthly').hidden=repeat!==4;this.el('annual').hidden=!annual;
    this.el('anniversary-value').hidden=!annual||!this.el('anniversary').checked;
    this.el('anniversary-base').required=annual&&this.el('anniversary').checked;
    this.el('anniversary-base').disabled=!annual||!this.el('anniversary').checked;
    this.el('repeat-help').textContent=repeat===4?'Wybierz wystąpienie i dzień tygodnia. Kalendarz sam wyznaczy terminy — nie musisz podawać daty.':repeat===2?(this.el('short-month').checked?'W krótszym miesiącu użyj ostatniego dnia. Oryginalna data pozostaje bez zmian.':'Miesiące bez wybranego dnia są pomijane.'):repeat===3?(this.el('short-month').checked?'29 lutego będzie przypominany 28 lutego w roku nieprzestępnym.':'29 lutego występuje tylko w latach przestępnych.'):repeat===1?'Powtarzanie co 7 dni od podanej daty.':'';
  }
  formPayload(){
    const [year,month,day]=this.el('date').value.split('-').map(Number),repeat=Number(this.el('repeat').value);
    const anniversary=repeat===3&&this.el('anniversary').checked;
    const time=this.el('event-time').value,timeMinutes=this.el('all-day').checked?-1:/^([01]\d|2[0-3]):[0-5]\d$/.test(time)?Number(time.slice(0,2))*60+Number(time.slice(3,5)):NaN;
    const payload={name:this.el('name').value,year,month,day,advance_days:Number(this.el('advance').value),repeat,
      monthly_occurrence:repeat===4?Number(this.el('occurrence').value):1,
      monthly_weekday:repeat===4?Number(this.el('weekday').value):1,
      short_month_last_day:[2,3].includes(repeat)&&this.el('short-month').checked,
      anniversary,anniversary_base:anniversary?Number(this.el('anniversary-base').value):0};
    if(timeMinutes!==-1)payload.time_minutes=timeMinutes;
    const endText=this.el('end-date')?.value||this.el('date').value;
    const [ey,em,ed]=endText.split('-').map(Number);
    const days=(Date.UTC(ey,em-1,ed)-Date.UTC(year,month-1,day))/86400000;
    const endTextTime=this.el('end-time')?.value||'';
    const endMinutes=this.el('all-day').checked?-1:/^([01]\d|2[0-3]):[0-5]\d$/.test(endTextTime)?Number(endTextTime.slice(0,2))*60+Number(endTextTime.slice(3,5)):NaN;
    if(!Number.isInteger(days)||days<0||days>366||ey>2099||!Number.isInteger(endMinutes)||(!this.el('all-day').checked&&days*1440+endMinutes<=timeMinutes))throw new Error('Koniec musi być późniejszy od początku. Maksymalna różnica dat: 366 dni.');
    payload.end_days=days;payload.end_time_minutes=endMinutes;
    return payload;
  }
  eventName(event,year){
    const name=event.anniversary?`${event.name} ${event.anniversary_base+Math.max(0,year-event.year)}`:event.name;
    const time=this.timeLabel(event);return time?`${name} — ${time}`:name;
  }
  selected(){return (this.devices||[]).find(d=>d.entry_id===this.el('devices').value);}
  async poll(){
    if(this.polling||!this._hass)return;this.polling=true;
    try{
      const response=await this._hass.connection.sendMessagePromise({type:'ecalendar/list'});
      this.devices=response.devices;const previous=this.el('devices').value;
      this.el('devices').replaceChildren();
      for(const device of this.devices){const option=document.createElement('option');option.value=device.entry_id;option.textContent=device.title;this.el('devices').append(option);}
      if(this.devices.some(d=>d.entry_id===previous))this.el('devices').value=previous;
      this.render();
    }catch(error){this.feedback(error.message||'Nie udało się pobrać listy z HA.',true);}
    finally{this.polling=false;}
  }
  render(){
    const device=this.selected();
    this.el('connection').textContent=device?`MAC: ${device.mac.match(/../g).join(':')} • ${device.available===true?'Połączony':device.available===false?'Rozłączony':'Oczekiwanie na połączenie'}`:'Dodaj integrację e-Calendar w ustawieniach HA.';
    const busy=!!(this.busy||device?.busy);
    this.el('open-add').disabled=!device||busy;this.el('close-add').disabled=busy;this.el('cancel-add').disabled=busy;this.el('add').disabled=!device||busy;this.el('refresh').disabled=!device||busy;this.el('devices').disabled=!!this.busy;
    this.renderDevice();this.renderHome();this.renderEvents();this.renderMonth();
  }
  renderDevice(){
    const d=this.selected(),status=d?.contact_age_seconds!=null&&d.contact_age_seconds<300?'● e-Calendar połączony':d?.last_contact?'● Brak aktualnego kontaktu':'● Oczekiwanie na dane';
    this.el('simple-status').textContent=status;
    this.el('refresh-home').disabled=!d||this.busy||d?.busy;
    const list=this.el('device-details');list.replaceChildren();
    const ages=Object.values(d?.measurements||{}).map(v=>v.age_seconds).filter(v=>v!==null&&v!==undefined);
    const rows=[['Nazwa',d?.title],['MAC',d?.mac?.match(/../g)?.join(':')],['Wersja integracji',d?.integration_version],['Wersja firmware',d?.device_info?.firmware||'Oczekiwanie — wymagany aktualny firmware'],['Adres IP',d?.device_info?.ip||'Oczekiwanie — wymagany aktualny firmware'],['Ostatni poprawny kontakt',d?.last_contact?new Date(d.last_contact).toLocaleString('pl-PL'):null],['Ostatnie dane pomiarowe',ages.length?Math.min(...ages)+' s temu':null],['Dostępność pomiarów',d?.measurements_available===true?'Działa':d?.measurements_available===false?'Brak poprawnych pomiarów przez 5 minut':'Oczekiwanie'],['Identyfikator w HA',d?.entry_id]];
    for(const [name,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value??'—';list.append(dt,dd);}
    this.el('connection').textContent='Diagnostyka pomiarów toleruje do 5 minut bez poprawnych danych. Nie steruje dostępnością encji MQTT ani odświeżaniem ekranu.';
  }
  showDay(cell){
    const detail=this.el('month-detail');detail.replaceChildren();detail.hidden=false;
    const heading=document.createElement('strong');heading.textContent=this.formatDate(cell.date);detail.append(heading);
    for(const event of cell.events){const line=document.createElement('p'),start=this.activeOccurrence(event,cell.date);line.textContent=this.eventName(event,start.year)+' — '+this.describe(event)+this.rangeLabel(event,start);const edit=document.createElement('button');edit.textContent='Edytuj';edit.disabled=this.busy||this.selected()?.busy||!this.selected()?.state?.supports_update;edit.onclick=()=>this.openEdit(event);line.append(edit);detail.append(line);}
    if(!cell.events.length){const line=document.createElement('p');line.textContent='Brak wydarzeń tego dnia.';detail.append(line);}
    const add=document.createElement('button');add.textContent='+ Dodaj wydarzenie na ten dzień';add.disabled=this.busy||this.selected()?.busy||cell.date.year<2000||cell.date.year>2099;add.onclick=()=>this.openAdd(cell.date);detail.append(add);
  }
  renderEvents(){
    const device=this.selected(),state=device?.state,container=this.el('events');container.replaceChildren();
    this.el('count').textContent=state?`(${state.count}/50)`:'';
    if(!state){const p=document.createElement('p');p.textContent='Oczekiwanie na wydarzenia z kalendarza. Użyj przycisku „Odśwież wydarzenia”.';container.append(p);return;}
    const query=this.el('search').value.trim().toLocaleLowerCase('pl');
    const events=state.events.filter(event=>String(event.name||'').toLocaleLowerCase('pl').includes(query));
    if(!events.length){const p=document.createElement('p');p.textContent=state.count?'Brak pasujących wydarzeń.':'Nie masz jeszcze własnych wydarzeń.';container.append(p);}
    const today=this.today();
    for(const event of events){
      const row=document.createElement('div');row.className='event';const date=document.createElement('div');date.className='date';const next=this.activeOccurrence(event,today)||this.nextOccurrence(event,today);date.textContent=this.formatDate(next||event);date.title=event.repeat?'Najbliższy termin':'Data wydarzenia';
      const content=document.createElement('div'),name=document.createElement('div');name.className='name';name.textContent=this.eventName(event,next?.year||today.year);
      const details=document.createElement('div');details.className='details';details.textContent=(event.repeat&&next?'Najbliższy termin • ':'')+this.describe(event)+this.rangeLabel(event,next||event);content.append(name,details);
      const button=document.createElement('button');button.className='remove';button.textContent='Usuń';button.disabled=!!(this.busy||device.busy);
      const revision=state.revision,index=event.index,entryId=device.entry_id;
      button.onclick=()=>{if(window.confirm(`Usunąć wydarzenie „${event.name}”?`))this.act('delete',{index,revision},entryId);};const actions=document.createElement('div');actions.className='bar';const edit=document.createElement('button');edit.textContent='Edytuj';edit.disabled=!!(this.busy||device.busy||!state.supports_update);edit.title=state.supports_update?'Edytuj zapisane wydarzenie':'Zaktualizuj firmware kalendarza';edit.onclick=()=>this.openEdit(event);actions.append(edit,button);row.append(date,content,actions);container.append(row);
    }
  }
  today(now=new Date()){
    // Use HA's timezone, not the browser's timezone. UTC below is civil-date arithmetic.
    const timeZone=this._hass?.config?.time_zone;
    if(timeZone){
      try{
        const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now);
        const value=type=>Number(parts.find(part=>part.type===type).value);
        return {year:value('year'),month:value('month'),day:value('day')};
      }catch{/* Fall back to the browser's local date for an invalid timezone. */}
    }
    return {year:now.getFullYear(),month:now.getMonth()+1,day:now.getDate()};
  }
  formatDate(value){return `${String(value.day).padStart(2,'0')}.${String(value.month).padStart(2,'0')}.${value.year}`;}
  nextOccurrence(event,today){
    const stamp=value=>Date.UTC(value.year,value.month-1,value.day);
    const tuple=value=>({year:value.getUTCFullYear(),month:value.getUTCMonth()+1,day:value.getUTCDate()});
    const valid=(year,month,day)=>{
      const result=new Date(Date.UTC(year,month-1,day));
      return result.getUTCFullYear()===year&&result.getUTCMonth()===month-1&&result.getUTCDate()===day?result:null;
    };
    const base=valid(event.year,event.month,event.day);
    if(!base)return null;
    if(!event.repeat)return {year:event.year,month:event.month,day:event.day};
    const now=stamp(today),start=Math.max(now,base.getTime());
    if(event.repeat===1){
      const delta=Math.max(0,Math.ceil((start-base.getTime())/(7*86400000)));
      return tuple(new Date(base.getTime()+delta*7*86400000));
    }
    const startDate=new Date(start),year=startDate.getUTCFullYear(),month=startDate.getUTCMonth()+1;
    if(event.repeat===3){
      for(let y=year;y<=year+8;y++){
        const candidate=valid(y,event.month,event.short_month_last_day?Math.min(event.day,new Date(Date.UTC(y,event.month,0)).getUTCDate()):event.day);
        if(candidate&&candidate.getTime()>=start)return tuple(candidate);
      }
    }
    if(event.repeat===2||event.repeat===4){
      for(let offset=0;offset<24;offset++){
        const first=new Date(Date.UTC(year,month-1+offset,1));
        const y=first.getUTCFullYear(),m=first.getUTCMonth()+1;
        let day=event.day;
        if(event.repeat===4){
          const weekday=event.monthly_weekday,occurrence=event.monthly_occurrence;
          if(!Number.isInteger(weekday)||weekday<0||weekday>6||!Number.isInteger(occurrence)||occurrence<1||occurrence>5)return null;
          if(occurrence===5){
            const last=new Date(Date.UTC(y,m,0));
            day=last.getUTCDate()-(last.getUTCDay()-weekday+7)%7;
          }else day=1+(weekday-first.getUTCDay()+7)%7+(occurrence-1)*7;
        }
        if(event.repeat===2&&event.short_month_last_day)day=Math.min(day,new Date(Date.UTC(y,m,0)).getUTCDate());
        const candidate=valid(y,m,day);
        if(candidate&&candidate.getTime()>=start)return tuple(candidate);
      }
    }
    return null;
  }
  describe(event){
    const repeat={0:'Brak',1:'Co tydzień',2:'Co miesiąc',3:'Co rok',4:'Wybrany dzień tygodnia w miesiącu'};
    let text=`Wyświetlaj: ${event.advance_days?`${event.advance_days} dni wcześniej`:'w dniu wydarzenia'} • Powtarzanie: ${repeat[event.repeat]??event.repeat}`;
    if(event.repeat===4){const days=['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota'];text+=` (${event.monthly_occurrence===5?'ostatni':event.monthly_occurrence+'.'}: ${days[event.monthly_weekday]||event.monthly_weekday})`;}
    if(event.short_month_last_day)text+=' • W krótszym miesiącu: ostatni dzień';
    if(event.anniversary)text+=` • Wartość początkowa: ${event.anniversary_base} w ${event.year} roku`;
    return text;
  }
  feedback(text,error=false){for(const id of ['feedback','dialog-feedback']){this.el(id).textContent=text;this.el(id).classList.toggle('error',error);}}
  async act(action,payload,entryId){
    if(this.busy)return;const device=this.selected();if(!device)return;
    if(['add','update'].includes(action)&&this.el('add-dialog').open&&device.entry_id!==this.dialogEntryId){this.feedback('Wybrany kalendarz zmienił się. Zamknij formularz i otwórz go ponownie.',true);return;}
    this.busy=true;this.render();this.feedback('Łączę się z kalendarzem. Poczekaj na potwierdzenie…');
    try{
      const result=await this._hass.connection.sendMessagePromise({type:`ecalendar/${action}`,entry_id:entryId||device.entry_id,...payload});
      const messages={updated:'Wydarzenie zmienione. Ekran kalendarza się odświeża.',saved:'Wydarzenie zapisane. Ekran kalendarza się odświeża.',exists:'Takie wydarzenie już istnieje.',deleted:'Wydarzenie usunięte. Ekran kalendarza się odświeża.',refreshed:'Wydarzenia pobrane z kalendarza.',conflict:'Lista zmieniła się. Sprawdź ją i ponownie otwórz wydarzenie.'};
      this.feedback(messages[result.status]||result.message||'Nieznana odpowiedź kalendarza.',!['updated','saved','exists','deleted','refreshed'].includes(result.status));
      if((action==='add'&&result.status==='saved')||(action==='update'&&result.status==='updated')){this.el('name').value='';if(this.el('add-dialog').open)this.el('add-dialog').close();}
    }catch(error){this.feedback(error.message||'Brak potwierdzenia. Odśwież listę przed ponowną próbą.',true);}
    finally{this.busy=false;await this.poll();this.render();}
  }
}
if(!customElements.get('ecalendar-panel'))customElements.define('ecalendar-panel',ECalendarPanel);
