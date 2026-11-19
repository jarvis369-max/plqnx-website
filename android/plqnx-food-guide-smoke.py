import os,subprocess,time,hashlib
from pathlib import Path
OUT=Path(os.environ.get('GITHUB_WORKSPACE','.'))
PKG='com.plqnx.foodguide'
def adb(*args,binary=False):
 r=subprocess.run(['adb',*map(str,args)],capture_output=True,text=not binary)
 if r.returncode:raise RuntimeError('adb '+str(args)+' failed '+str(r.stderr)[-300:])
 return r.stdout
def snap(name):
 raw=adb('exec-out','screencap','-p',binary=True)
 assert len(raw)>20000, 'Screenshot incomplete'
 (OUT/(name+'.png')).write_bytes(raw)
 return hashlib.sha256(raw).hexdigest()
def tap(x,y):
 adb('shell','input','tap',x,y)
 time.sleep(2.5)
adb('install','/tmp/food-guide-build/outputs/apk/debug/app-debug.apk')
adb('logcat','-c')
adb('shell','am','start','-n',PKG+'/.MainActivity')
time.sleep(7)
h={}
h['welcome']=snap('welcome')
tap(540,1470)
h['home']=snap('home')
tap(780,2300)
h['plan']=snap('plan')
tap(540,2300)
h['scan']=snap('scan')
tap(965,2300)
h['profile']=snap('profile')
tap(320,2300)
h['diary']=snap('diary')
assert len(set(h.values()))>=4, 'Navigation did not change expected screens'
adb('shell','wm','size','720x1600')
adb('shell','wm','density','320')
adb('shell','settings','put','system','font_scale','1.3')
adb('shell','am','force-stop',PKG)
adb('shell','am','start','-n',PKG+'/.MainActivity')
time.sleep(7)
snap('compact-home')
tap(360,1510)
snap('compact-scan')
log=adb('logcat','-d','-s','AndroidRuntime:E')
(OUT/'android-runtime.log').write_text(log)
assert 'FATAL EXCEPTION' not in log, 'Android runtime crashed: '+log[-3000:]
print('PASS: start, navigation screenshot transitions, compact view, no fatal exception')
