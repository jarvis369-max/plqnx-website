import os, re, subprocess, time, xml.etree.ElementTree as ET
from pathlib import Path
OUT=Path(os.environ.get("GITHUB_WORKSPACE","."))
PKG="com.plqnx.notes"
def adb(*args, read=True):
    p=subprocess.run(["adb",*args],capture_output=read,text=read,check=True)
    return p.stdout if read else ""
def dump(name):
    adb("shell","uiautomator","dump","/data/local/tmp/visual.xml")
    xml=adb("shell","cat","/data/local/tmp/visual.xml")
    (OUT/(name+".xml")).write_text(xml)
    return ET.fromstring(xml)
def screen(name):
    with (OUT/(name+".png")).open("wb") as f:
        subprocess.run(["adb","exec-out","screencap","-p"],stdout=f,check=True)
def run(mode):
    if mode=="compact":
        adb("shell","wm","size","720x1600")
        adb("shell","wm","density","320")
        adb("shell","settings","put","system","font_scale","1.35")
    adb("shell","am","force-stop",PKG)
    adb("shell","am","start","-n",PKG+"/.MainActivity")
    time.sleep(6)
    root=dump(mode+"-home")
    screen(mode+"-home")
    nodes=list(root.iter("node"))
    links=[n for n in nodes if "Create new note" in n.get("content-desc","")]
    if not links:
        raise AssertionError("New-note button missing in "+mode+" home: "+str([(n.get("text"),n.get("content-desc")) for n in nodes if n.get("clickable")=="true"])[-1500:])
    match=re.findall(r"\d+",links[0].get("bounds",""))
    if len(match)!=4: raise AssertionError("Bad button bounding box")
    x=(int(match[0])+int(match[2]))//2
    y=(int(match[1])+int(match[3]))//2
    adb("logcat","-c")
    adb("shell","input","tap",str(x),str(y))
    time.sleep(5)
    ed=dump(mode+"-editor")
    screen(mode+"-editor")
    editors=[n for n in ed.iter("node") if n.get("class")=="android.widget.EditText"]
    if len(editors)<2:
        raise AssertionError("Editor not open for "+mode+"; input nodes "+str([(n.get("text"),n.get("content-desc")) for n in editors]))
    logs=adb("logcat","-d","-s","AndroidRuntime:E")
    (OUT/(mode+"-android-runtime.log")).write_text(logs)
    if "FATAL EXCEPTION" in logs:
        raise AssertionError("Runtime crash in "+mode+" editor: "+logs[-4000:])
    print(mode+": editor opened, two inputs visible, no fatal exception",flush=True)
adb("install","/tmp/plqnx-downloaded/outputs/apk/debug/app-debug.apk")
run("default")
run("compact")
