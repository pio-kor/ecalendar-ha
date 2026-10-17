# e-Calendar — Home Assistant

Integracja lokalnego kalendarza e-paper z Home Assistant. Wersja 0.9.7.

## Funkcje
- Panel Start / Wydarzenia / Urządzenie.
- Lista i widok miesiąca. Kliknięcie dnia otwiera dodawanie z wybraną datą; pasek wydarzenia otwiera szczegóły i edycję.
- Dodawanie, edycja i usuwanie wydarzeń, zakresy dat i godziny.
- Powtarzanie tygodniowe, miesięczne, roczne i wybrany dzień tygodnia miesiąca, urodziny oraz rocznice.
- Standardowa encja kalendarza do widoku HA i automatyzacji, liczba wydarzeń i najbliższe wydarzenie.
- Podgląd czujników udostępnionych przez urządzenie: temperatura, wilgotność i ciśnienie.
- Diagnostyka urządzenia i komunikacji.

Dane są przesyłane lokalnie przez MQTT. Wydarzenia pozostają w e-Calendar również po wyłączeniu Home Assistant. Integracja nie dodaje obsługi CO₂.

## Wymagania
Home Assistant 2026.3 lub nowszy, działająca integracja MQTT oraz e-Calendar połączony z tym samym brokerem. Pełna edycja, zakresy i informacje urządzenia wymagają firmware udostępniającego te funkcje (wersja projektu 1.2.0).

## Instalacja przez HACS
1. Otwórz HACS → menu z trzema kropkami → Własne repozytoria.
2. Dodaj https://github.com/pio-kor/ecalendar-ha i wybierz typ Integracja.
3. Wyszukaj e-Calendar w HACS i pobierz.
4. Uruchom ponownie Home Assistant.
5. Ustawienia → Urządzenia i usługi → Dodaj integrację → e-Calendar.
6. Podaj MAC z zakładki Serwis w panelu WWW kalendarza.

Panel i zmiana wydarzeń wymagają konta administratora HA.

## Przejście z instalacji ręcznej
Zachowaj kopię /config/custom_components/ecalendar. Dodaj repozytorium do HACS, pobierz integrację i uruchom ponownie HA. Nie usuwaj istniejącego wpisu integracji ani urządzenia. Odśwież przeglądarkę Ctrl+F5 i sprawdź wersję 0.9.7 w zakładce Urządzenie.

## Aktualizacje
Instaluj nowe wersje z HACS, następnie uruchom ponownie HA. Podmiana plików integracji nie usuwa wydarzeń zapisanych w kalendarzu.

## Daty i automatyzacje
Końcowa data całodniowego wydarzenia jest ostatnim dniem włącznie. Ekran e-paper odświeża się według dat, a godziny można wykorzystać w automatyzacjach HA. Dni wcześniejszego przypomnienia nie przesuwają dat wydarzenia w HA. Edycja cyklicznego wydarzenia zmienia całą serię.

## Zgłaszanie problemów
Podaj wersję integracji i firmware oraz opis kroków. Nie przesyłaj haseł Wi-Fi/MQTT, kluczy licencyjnych ani kopii pamięci urządzenia.
