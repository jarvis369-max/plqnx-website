#!/usr/bin/env python3
"""Exercise onboarding, lesson, audio and compact-layout flows with the exact built APK."""
import os,re,subprocess,time,xml.etree.ElementTree as ET
from pathlib import Path
OUT=Path(os.environ["GITHUB_WORKSPACE"])
APK="/tmp/plqnx-languages-apk/outputs/apk/debug/app-debug.apk"
PACKAGE="com.plqnx.languages"
def adb(*args,raw=False):
    cmd=["adb",*args]
    if raw:return subprocess.check_output(cmd)
    return subprocess.check_output(cmd,text=True,stderr=subprocess.STDOUT).strip()
def screenshot(name):
    (OUT/(name+".png")).write_bytes(adb("exec-out","screencap","-p",raw=True))
def hierarchy(name):
    adb("shell","uiautomator","dump","/data/local/tmp/plqnx_window.xml")
    result=adb("shell","cat","/data/local/tmp/plqnx_window.xml")
    (OUT/(name+".xml")).write_text(result)
    return ET.fromstring(result)
def tap_label(root,phrase,exact=False):
    candidates=[]
    for n in root.iter("node"):
        t=n.get("text","")
        desc=n.get("content-desc","")
        if (t==phrase if exact else phrase.lower() in (t+" "+desc).lower()):
            nums=re.findall(r"\d+",n.get("bounds",""))
            if len(nums)==4:
                x=(int(nums[0])+int(nums[2]))//2
                y=(int(nums[1])+int(nums[3]))//2
                candidates.append((x,y,n.get("text"),n.get("content-desc")))
    if not candidates:
        print("SCREEN CONTROLS",[(n.get("text"),n.get("content-desc")) for n in root.iter("node") if n.get("text") or n.get("content-desc")][-50:],flush=True)
        raise AssertionError("Could not tap control: "+phrase)
    x,y,txt,desc=candidates[0]
    print("TAP",phrase,x,y,txt,desc,flush=True)
    adb("shell","input","tap",str(x),str(y))
    time.sleep(1.5)
def verify_no_crash(name):
    log=adb("logcat","-d","-s","AndroidRuntime:E")
    (OUT/(name+"-logcat.txt")).write_text(log)
    assert "FATAL EXCEPTION" not in log, "AndroidRuntime exception: "+log[-4000:]
print(adb("install",APK),flush=True)
adb("shell","am","start","-n",PACKAGE+"/.MainActivity")
time.sleep(4)
home=hierarchy("onboarding")
screenshot("onboarding")
print("ONBOARDING TEXT",[(n.get("text"),n.get("content-desc")) for n in home.iter("node") if n.get("text") or n.get("content-desc")][:35],flush=True)
# First launch starts with English as the learning source.
if not any("Continue learning" in n.get("text","") for n in home.iter("node")):
    tap_label(home,"Telugu",exact=True)
home=hierarchy("home-default")
screenshot("home-default")
assert any("Continue learning" in n.get("text","") for n in home.iter("node")),"Home lesson button missing"
tap_label(home,"Continue learning")
lesson=hierarchy("lesson-default")
screenshot("lesson-default")
assert any("Choose the translation" in n.get("text","") for n in lesson.iter("node")),"First challenge not shown"
tap_label(lesson,"A",exact=True)
feedback=hierarchy("feedback-default")
screenshot("feedback-default")
assert any("Continue" in n.get("text","") for n in feedback.iter("node")),"Feedback did not appear"
tap_label(feedback,"Continue")
listen=hierarchy("listening-default")
screenshot("listening-default")
assert any("Listen and pick" in n.get("text","") for n in listen.iter("node")),"Listening challenge missing"
verify_no_crash("normal")
# Back to home using system back gesture for modern Android, then test compact display.
adb("shell","input","keyevent","4")
time.sleep(1)
adb("shell","wm","size","720x1600")
adb("shell","wm","density","320")
adb("shell","settings","put","system","font_scale","1.3")
adb("shell","am","force-stop",PACKAGE)
adb("shell","am","start","-n",PACKAGE+"/.MainActivity")
time.sleep(4)
compact=hierarchy("home-compact")
screenshot("home-compact")
assert any("Continue learning" in n.get("text","") for n in compact.iter("node")),"Home unreadable in compact layout"
tap_label(compact,"Continue learning")
compact_lesson=hierarchy("lesson-compact")
screenshot("lesson-compact")
assert any("Choose the translation" in n.get("text","") for n in compact_lesson.iter("node")),"Compact lesson did not open"
verify_no_crash("compact")
print("PASS: course selected, learning path launched, answer feedback displayed, listening and compact screens opened with no fatal exception.",flush=True)
