import os,subprocess,time,xml.etree.ElementTree as ET,re
from pathlib import Path
OUT=Path(os.environ.get('GITHUB_WORKSPACE','.'))
PKG='com.plqnx.foodguide'
def adb(*args,binary=False):
    r=subprocess.run(['adb',*map(str,args)],capture_output=True,text=not binary)
    if r.returncode:raise RuntimeError('adb '+str(args)+' failed '+str(r.stderr)[-300:])
    return r.stdout
def snap(name):
    (OUT/(name+'.png')).write_bytes(adb('exec-out','screencap','-p',binary=True))
def dump(name):
    adb('shell','uiautomator','dump','/data/local/tmp/food.xml')
    s=adb('shell','cat','/data/local/tmp/food.xml')
    (OUT/(name+'.xml')).write_text(s)
    return ET.fromstring(s)
def find(root,name):
    for n in root.iter('node'):
        text=(n.get('text','')+' '+n.get('content-desc','')).lower()
        if name.lower() in text:return n
    return None
def tap(root,name):
    n=find(root,name)
    if not n:
        labels=[n.get('text') for n in root.iter('node') if n.get('text')]
        raise AssertionError('Missing UI text: '+name+' visible: '+str(labels[-65:]))
    b=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
    assert len(b)==4
    adb('shell','input','tap',(b[0]+b[2])//2,(b[1]+b[3])//2)
    time.sleep(1.8)
    return dump('after-'+name.replace(' ','-')[:24])
adb('install','/tmp/food-guide-build/outputs/apk/debug/app-debug.apk')
adb('logcat','-c')
adb('shell','am','start','-n',PKG+'/.MainActivity')
time.sleep(7)
root=dump('welcome')
snap('welcome')
assert find(root,'Eat well') or find(root,'Create my guide'),'Welcome UI missing'
root=tap(root,'Explore without a profile')
snap('home')
assert find(root,'Good food'),'Dashboard header missing'
root=tap(root,'Food explorer')
snap('food-library')
assert find(root,'Find your food'),'Food explorer missing'
assert find(root,'Vegetable poha'),'Food catalog not visible'
root=tap(root,'My plan')
snap('plan')
assert find(root,'7-day food guide'),'Plan screen missing'
root=tap(root,'Scan')
snap('scan')
assert find(root,'plate'),'Photo analysis screen missing'
root=tap(root,'Profile')
snap('profile')
assert find(root,'Made around you'),'Profile screen missing'
adb('shell','wm','size','720x1600')
adb('shell','wm','density','320')
adb('shell','settings','put','system','font_scale','1.3')
adb('shell','am','force-stop',PKG)
adb('shell','am','start','-n',PKG+'/.MainActivity')
time.sleep(7)
root=dump('compact-home')
snap('compact-home')
assert find(root,'Good food'),'Compact dashboard unavailable'
root=tap(root,'Scan')
snap('compact-scan')
assert find(root,'plate'),'Compact photo screen unavailable'
log=adb('logcat','-d','-s','AndroidRuntime:E')
(OUT/'android-runtime.log').write_text(log)
assert 'FATAL EXCEPTION' not in log,'Android app crash:'+log[-3000:]
print('PASS: welcome, home, explore, plan, photo scan, profile and compact view, no Android crash.')
