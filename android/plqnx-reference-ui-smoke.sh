#!/usr/bin/env bash
set -euo pipefail
APK=/tmp/plqnx-reference/PlqnxNotes/app/build/outputs/apk/debug/app-debug.apk
echo "Installing source-matched test APK"
adb install "$APK"
adb shell am start -n com.plqnx.notes/.MainActivity
sleep 5
adb exec-out screencap -p > "$GITHUB_WORKSPACE/reference-home.png"
adb shell uiautomator dump /data/local/tmp/plqnx-home.xml
adb shell cat /data/local/tmp/plqnx-home.xml > "$GITHUB_WORKSPACE/reference-home.xml"
python3 - <<'PY'
import xml.etree.ElementTree as ET, re, subprocess
root=ET.parse('reference-home.xml').getroot()
nodes=list(root.iter('node'))
titles=[(n.get('text') or '',n.get('content-desc') or '') for n in nodes]
print('HOME CONTROLS',titles[:40])
fab=[n for n in nodes if 'Create new note' in (n.get('content-desc') or '')]
if not fab:raise RuntimeError('Floating + button missing')
nums=list(map(int,re.findall(r'\d+',fab[0].get('bounds',''))))
if len(nums)!=4:raise RuntimeError('Invalid + bounds')
x=(nums[0]+nums[2])//2;y=(nums[1]+nums[3])//2
subprocess.check_call(['adb','logcat','-c'])
print('TAP NEW NOTE',x,y,flush=True)
subprocess.check_call(['adb','shell','input','tap',str(x),str(y)])
PY
sleep 5
adb exec-out screencap -p > "$GITHUB_WORKSPACE/reference-editor.png"
adb shell uiautomator dump /data/local/tmp/plqnx-editor.xml
adb shell cat /data/local/tmp/plqnx-editor.xml > "$GITHUB_WORKSPACE/reference-editor.xml"
adb logcat -d -s AndroidRuntime:E > "$GITHUB_WORKSPACE/reference-runtime.log"
if grep -q 'FATAL EXCEPTION' "$GITHUB_WORKSPACE/reference-runtime.log"; then
  cat "$GITHUB_WORKSPACE/reference-runtime.log"
  exit 41
fi
python3 - <<'PY'
import xml.etree.ElementTree as ET
root=ET.parse('reference-editor.xml').getroot()
nodes=list(root.iter('node'))
names=' '.join((n.get('text') or '')+' '+(n.get('content-desc') or '') for n in nodes)
print('EDITOR INPUTS',[(n.get('class'),n.get('text'),n.get('hint')) for n in nodes if n.get('class','').endswith('EditText')])
if 'Attach photo' not in names and 'Record a voice note' not in names:raise RuntimeError('Editor toolbar not present')
if not any(n.get('class','').endswith('EditText') for n in nodes):raise RuntimeError('Editor input missing')
PY
adb shell pidof com.plqnx.notes >/dev/null
python3 - <<'PY'
import xml.etree.ElementTree as ET, re, subprocess
root=ET.parse('reference-editor.xml').getroot()
back=[n for n in root.iter('node') if 'Save and return to notes' in (n.get('content-desc') or '')]
if not back: raise RuntimeError('Editor back button missing')
bounds=list(map(int,re.findall(r'\\d+',back[0].get('bounds',''))))
if len(bounds)!=4: raise RuntimeError('Invalid editor back coordinates')
x=(bounds[0]+bounds[2])//2; y=(bounds[1]+bounds[3])//2
print('Returning to home',x,y,flush=True)
subprocess.check_call(['adb','shell','input','tap',str(x),str(y)])
PY
sleep 4
adb exec-out screencap -p > "$GITHUB_WORKSPACE/reference-home-after.png"
adb shell uiautomator dump /data/local/tmp/plqnx-home-after.xml
adb shell cat /data/local/tmp/plqnx-home-after.xml > "$GITHUB_WORKSPACE/reference-home-after.xml"
python3 - <<'PY'
import xml.etree.ElementTree as ET
nodes=list(ET.parse('reference-home-after.xml').getroot().iter('node'))
labels=' '.join((n.get('text') or '')+' '+(n.get('content-desc') or '') for n in nodes)
if 'Create new note' not in labels or 'Pinned' not in labels: raise RuntimeError('Home navigation not restored')
print('HOME CHECKED: navigation and category chips visible')
PY
echo 'PASS: home, editor, + action, no runtime crash'
