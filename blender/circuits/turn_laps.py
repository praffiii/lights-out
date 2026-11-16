import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from circuit import CID, PINS, Track


def main():
    path = os.path.join(PINS, f"{CID}.json")
    pins = json.load(open(path))
    pins["laps"] = Track().laps()
    json.dump(pins, open(path, "w"), indent=1)
    print("done laps", CID)


main()
