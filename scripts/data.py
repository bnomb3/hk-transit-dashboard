import csv
import json
import requests
from opencc import OpenCC

# Initialize OpenCC converter
cc = OpenCC('t2s')  # Traditional to Simplified Chinese

# retrieve mtr stations data
stations = {}
stations_data = requests.get("https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv").content.decode('utf-8')
for row in csv.reader(stations_data.splitlines(), delimiter=',', quotechar='"'):
    line = row[0]
    if len(line) != 3:
        continue 
    stationCode = row[2]
    stationId = row[3]
    chineseName = row[4]
    englishName = row[5]
    if line not in stations:
        stations[line] = {}
    stations[line][stationCode] = {
        "stationId": stationId,
        "name_tc": chineseName,
        "name_sc": cc.convert(chineseName),  # Convert to Simplified Chinese
        "name_en": englishName
    }
with open("../src/data/mtrStations.json", "w", encoding='utf-8') as jsonfile:
    json.dump(stations, jsonfile, indent=2, ensure_ascii=False)

# retrieve mtr lines data
mtr = {}
mtr_data = requests.get("https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv").content.decode('utf-8')
for row in csv.reader(mtr_data.splitlines(), delimiter=',', quotechar='"'):
    if len(row[0]) == 3:
        line = row[0]
        direction = row[1]
        stationCode = row[2]
        stationId = row[3]
        chineseName = row[4]
        englishName = row[5]
        sequence = int(float(row[6]))
        station_data = {
            "seq": sequence, 
            "station": stationCode, 
            "stationId": stationId,
            "name_tc": chineseName,
            "name_sc": cc.convert(chineseName),  # Convert to Simplified Chinese
            "name_en": englishName
        }
        
        if line not in mtr:
            mtr[line] = {}
            mtr[line][direction] = [station_data]
        elif direction not in mtr[line]:
            mtr[line][direction] = [station_data]
        else:
            mtr[line][direction].append(station_data)

# Define line names with Traditional Chinese and use OpenCC for Simplified Chinese
line_names_tc = {
    "AEL": {"en": "Airport Express Line", "tc": "機場快綫"},
    "EAL": {"en": "East Rail Line", "tc": "東鐵綫"},
    "ISL": {"en": "Island Line", "tc": "港島綫"},
    "KTL": {"en": "Kwun Tong Line", "tc": "觀塘綫"},
    "SIL": {"en": "South Island Line", "tc": "南港島綫"},
    "TCL": {"en": "Tung Chung Line", "tc": "東涌綫"},
    "TKL": {"en": "Tseung Kwan O Line", "tc": "將軍澳綫"},
    "TML": {"en": "Tuen Ma Line", "tc": "屯馬綫"},
    "TWL": {"en": "Tsuen Wan Line", "tc": "荃灣綫"}
}

# Convert to include Simplified Chinese
line_names = {}
for line_code, names in line_names_tc.items():
    line_names[line_code] = {
        "en": names["en"],
        "tc": names["tc"],
        "sc": cc.convert(names["tc"])
    }

with open("../src/data/mtrData.json", "w", encoding='utf-8') as jsonfile:
    json.dump({"stations": mtr, "lines": line_names}, jsonfile, indent=2, ensure_ascii=False)

# retrieve holidays
holidays = []
holidays_data = json.loads(requests.get("https://www.1823.gov.hk/common/ical/en.json").content.decode('utf-8'))

for holiday in holidays_data['vcalendar'][0]['vevent']:
    holidays.append(holiday['dtstart'][0])

with open("../src/data/publicHolidays.json", "w", encoding='utf-8') as jsonfile:
    json.dump(holidays, jsonfile, indent=2)
