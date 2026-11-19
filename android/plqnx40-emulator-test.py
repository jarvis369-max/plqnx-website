import os, subprocess, re, time, xml.etree.ElementTree as ET
from pathlib import Path
OUT=Path(os.environ.get('GITHUB_WORKSPACE','.'))
PKG='com.plqnx.languages'
def adb(*args, binary=False):
 p=subprocess.run(['adb',*map(str,args)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=not binary)
 if p.returncode: raise RuntimeError('adb '+str(args)+' failed: '+str(p.stderr)[-600:])
 return p.stdout
def dump(tag):
 adb('shell','uiautomator','dump','/data/local/tmp/plqnx.xml')
 text=adb('shell','cat','/data/local/tmp/plqnx.xml')
 (OUT/(tag+'.xml')).write_text(text,encoding='utf-8')
 return ET.fromstring(text)
def snap(tag):
 (OUT/(tag+'.png')).write_bytes(adb('exec-out','screencap','-p',binary=True))
def find(root,needle):
 for n in root.iter('node'):
  if needle.lower() in ((n.get('text','')+' '+n.get('content-desc','')).lower()):return n
 return None
def tap(root,needle):
 n=find(root,needle)
 if n is None:
  found=[(x.get('text'),x.get('content-desc')) for x in root.iter('node') if x.get('text') or x.get('content-desc')]
  raise AssertionError('Missing '+needle+'; visible='+str(found[-80:]))
 bounds=re.findall(r'\d+',n.get('bounds',''))
 if len(bounds)!=4:raise RuntimeError('Invalid clickable bounds for '+needle)
 x=(int(bounds[0])+int(bounds[2]))//2;y=(int(bounds[1])+int(bounds[3]))//2
 adb('shell','input','tap',x,y);time.sleep(1.0)
 return dump('after-'+needle.replace(' ','-').replace('/','-')[:23])
def verify_no_crash():
 text=adb('logcat','-d','-s','AndroidRuntime:E')
 (OUT/'android-runtime.log').write_text(text,encoding='utf-8')
 if 'FATAL EXCEPTION' in text:raise AssertionError('ANDROID CRASH '+text[-3000:])
 print('No AndroidRuntime fatal exceptions')
adb('install','/tmp/plqnx40-artifact/outputs/apk/debug/app-debug.apk')
adb('logcat','-c');adb('shell','am','start','-n',PKG+'/.MainActivity');time.sleep(5)
root=dump('onboard-language');snap('onboard-language')
assert find(root,'What language would you like to learn?') is not None,'Onboarding language selector missing'
assert find(root,'Search 40 languages') is not None,'40-language search input missing'
# Search specifically for Japanese in the 40-language list.
n=find(root,'Search 40 languages');b=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
adb('shell','input','tap',(b[0]+b[2])//2,(b[1]+b[3])//2)
adb('shell','input','text','Japanese');time.sleep(1)
root=dump('language-search');snap('language-search')
assert find(root,'Japanese') is not None,'Japanese course missing'
# Pick the actual course row, not the search field that now also reads "Japanese".
matches=[x for x in root.iter('node') if x.get('text')=='Japanese' and x.get('class')!='android.widget.EditText']
assert matches,'Japanese language row not found after filtering'
b=list(map(int,re.findall(r'\\d+',matches[-1].get('bounds',''))))
assert len(b)==4
adb('shell','input','tap',(b[0]+b[2])//2,(b[1]+b[3])//2)
time.sleep(1)
# Keyboard may still be present; button should remain visible after resize.
root=dump('selected-Japanese');
if find(root,'CONTINUE') is None:adb('shell','input','keyevent','4');root=dump('selected-Japanese')
root=tap(root,'CONTINUE')
assert find(root,'Every word is a new possibility') is not None,'Welcome step missing'
snap('onboard-welcome')
root=tap(root,'CONTINUE')
assert find(root,'Choose your coaching style') is not None,'Coaching style step missing'
snap('onboard-style')
root=tap(root,'CONTINUE')
assert find(root,'Speech settings') is None or find(root,'Sound & pronunciation') is not None
assert find(root,'INSTALL / MANAGE VOICE DATA') is not None,'Optional voice setup action missing'
snap('onboard-voice')
root=tap(root,'START LEARNING')
assert find(root,'Japanese') is not None,'Home screen not displaying selected course'
snap('home-default')
root=tap(root,'CONTINUE LEARNING')
assert find(root,'CHECK ANSWER') is not None,'Lesson did not open'
snap('lesson-choice')
for idx in range(2):
 # Depending on direction, choices show English meaning or Japanese romanization.
 candidates=['konnichiwa','arigatou','hai','iie','Hello','Thank you','Yes','No']
 pick=next((x for x in candidates if find(root,x) is not None),None)
 if pick is None:raise AssertionError('No lesson answer options found')
 root=tap(root,pick)
 root=tap(root,'CHECK ANSWER')
 assert find(root,'CONTINUE') is not None,'Answer feedback missing'
 root=tap(root,'CONTINUE')
 if idx==0:snap('lesson-meaning')
assert find(root,'Type using English letters') is not None,'Latin typing question missing'
snap('lesson-latin-input')
edit=[n for n in root.iter('node') if n.get('class')=='android.widget.EditText']
assert edit,'Latin letters answer text field missing'
b=list(map(int,re.findall(r'\d+',edit[0].get('bounds',''))));adb('shell','input','tap',(b[0]+b[2])//2,(b[1]+b[3])//2)
adb('shell','input','text','konnichiwa');time.sleep(1)
root=dump('latin-typed');snap('latin-typed')
assert find(root,'CHECK ANSWER') is not None,'Check button missing after keyboard'
root=tap(root,'CHECK ANSWER');assert find(root,'CONTINUE') is not None
verify_no_crash()
# Test larger text + narrower screen, progress should remain on device.
adb('shell','wm','size','720x1600');adb('shell','wm','density','320');adb('shell','settings','put','system','font_scale','1.3');
adb('shell','am','force-stop',PKG);adb('shell','am','start','-n',PKG+'/.MainActivity');time.sleep(5)
root=dump('home-compact');snap('home-compact')
assert find(root,'Japanese') is not None,'Compact home not rendered'
root=tap(root,'CONTINUE LEARNING');assert find(root,'CHECK ANSWER') is not None
snap('lesson-compact')
verify_no_crash()
print('PASS: onboarding, search, coach, voice setup, home, native-language Latin typing, compact font-size QA')