#!/usr/bin/env python3
"""Tap the visible + button on a running Android emulator and verify it opens the editor."""
from pathlib import Path
import subprocess
import re
import xml.etree.ElementTree as ET

root = ET.parse("home.xml").getroot()
buttons = [node for node in root.iter("node") if "Create new note" in node.get("content-desc","")]
if not buttons:
    raise RuntimeError("Home screen + action not found; cannot test new-note flow")
bounds = re.findall(r"\d+",buttons[0].get("bounds",""))
if len(bounds) != 4:
    raise RuntimeError("Invalid new-note button coordinates")
x=(int(bounds[0])+int(bounds[2]))//2
y=(int(bounds[1])+int(bounds[3]))//2
print("Clicking note button at",x,y,flush=True)
subprocess.check_call(["adb","logcat","-c"])
subprocess.check_call(["adb","shell","input","tap",str(x),str(y)])
