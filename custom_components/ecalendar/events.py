"""Local recurrence expansion shared by native HA entities."""
import calendar
import hashlib
import json
from datetime import date, datetime, time, timedelta


def event_id(event):
    data = {key: value for key, value in event.items() if key != "index"}
    return hashlib.sha256(json.dumps(data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def next_date(event, after):
    try:
        base = date(event["year"], event["month"], event["day"])
        repeat = event.get("repeat", 0)
        lower = max(base, after)
        if repeat == 0:
            return base if base >= after else None
        if repeat == 1:
            return base + timedelta(days=max(0, (lower-base).days+6)//7*7)
        if repeat in (2, 4):
            y, m = lower.year, lower.month
            while y <= 2099:
                last = calendar.monthrange(y, m)[1]
                if repeat == 2:
                    day = min(base.day,last) if event.get("short_month_last_day",False) else base.day
                else:
                    weekday = event.get("monthly_weekday", 1)
                    occurrence = event.get("monthly_occurrence", 1)
                    if not 0 <= weekday <= 6 or not 1 <= occurrence <= 5:
                        return None
                    pyweekday = (weekday+6) % 7
                    if occurrence == 5:
                        day = last-(date(y,m,last).weekday()-pyweekday)%7
                    else:
                        day = 1+(pyweekday-date(y,m,1).weekday())%7+7*(occurrence-1)
                if day <= last:
                    candidate = date(y,m,day)
                    if candidate >= lower:
                        return candidate
                m += 1
                if m == 13:
                    y, m = y+1, 1
        if repeat == 3:
            for y in range(lower.year, 2100):
                try:
                    candidate = date(y,base.month,min(base.day,calendar.monthrange(y,base.month)[1]) if event.get("short_month_last_day",False) else base.day)
                except ValueError:
                    continue
                if candidate >= lower:
                    return candidate
    except (ValueError, KeyError, TypeError, OverflowError):
        return None
    return None


def occurrence(event, day, tz):
    title = event.get("name", "")
    if event.get("anniversary") and event.get("repeat") == 3:
        title += " " + str(event.get("anniversary_base",0)+day.year-event["year"])
    minutes = event.get("time_minutes", -1)
    timed = type(minutes) is int and 0 <= minutes < 1440
    if timed:
        start = datetime.combine(day, time(minutes//60,minutes%60), tz)
        end_minutes=event.get("end_time_minutes",-1)
        if type(end_minutes) is int and 0 <= end_minutes < 1440:
            end_day=day+timedelta(days=event.get("end_days",0))
            end=datetime.combine(end_day,time(end_minutes//60,end_minutes%60),tz)
        else:
            end = start+timedelta(minutes=1) # zgodnosc ze starym wpisem bez konca
    else:
        start, end = day, day+timedelta(days=event.get("end_days",0)+1)
    return {"start":start,"end":end,"summary":title,"uid":event_id(event),
            "description":f"Wyświetlaj {event.get('advance_days',0)} dni wcześniej. " +
            ("Wydarzenie z godzinami." if timed and event.get("end_time_minutes",-1)>=0 else "Stary wpis z samą godziną: czas trwania w HA 1 minuta." if timed else "Wydarzenie całodniowe.")}


def as_datetime(value, tz):
    return value if isinstance(value,datetime) else datetime.combine(value,time(),tz)


def events_between(events, start, end):
    result = []
    for event in events:
        cursor = start.date()-timedelta(days=event.get("end_days",0)+1)
        while cursor <= end.date():
            day = next_date(event,cursor)
            if day is None or day > end.date():
                break
            item = occurrence(event,day,start.tzinfo)
            if as_datetime(item["end"],start.tzinfo)>start and as_datetime(item["start"],start.tzinfo)<end:
                result.append(item)
            cursor = day+timedelta(days=1)
    return sorted(result,key=lambda item:as_datetime(item["start"],start.tzinfo))


def upcoming(events, now):
    result=[]
    for event in events:
        cursor=now.date()-timedelta(days=event.get("end_days",0)+1)
        while True:
            day=next_date(event,cursor)
            if day is None:
                break
            item=occurrence(event,day,now.tzinfo)
            if as_datetime(item["end"],now.tzinfo)>now:
                result.append((item,event))
                break
            cursor=day+timedelta(days=1)
    result.sort(key=lambda pair:as_datetime(pair[0]["start"],now.tzinfo))
    return result
