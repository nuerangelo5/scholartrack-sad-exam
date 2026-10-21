# Mandatory Functional Test Results – TC01 to TC10

**System:** ScholarTrack  
**Academic Year / Semester:** 2026-2027 / 1  
**Tester:** ________________  
**Date:** ________________

| Test ID | Input / Action | Expected Result | Actual Result | Pass / Fail | Evidence |
|---------|----------------|-----------------|---------------|-------------|----------|
| TC01 | Evaluate B01 (GWA 2.00, at deadline) | Compliant | | | |
| TC02 | Evaluate B02 (GWA 2.01) | With Deficiency – GWA reason | | | |
| TC03 | Evaluate B03 (Access, 1 dropped) | Compliant | | | |
| TC04 | Evaluate B04 (14 units + 1 INC) | With Deficiency – units + incomplete | | | |
| TC05 | Evaluate B05 (1 failed + 1 min late) | With Deficiency – failed + late | | | |
| TC06 | Attempt evaluate / approve B06 (pending) | Both blocked until verified | | | |
| TC07 | Duplicate semester + GWA 0.50 / negative count | Rejected with clear message | | | |
| TC08 | Scholar tries to view another scholar / perform verification | Backend / role check denies | | | |
| TC09 | Return → correct → resubmit → refresh | Returns to Pending; history preserved | | | |
| TC10 | Approve compliant + Hold deficient; scholar cannot change decision | Staff succeeds; scholar blocked | | | |

**Notes / Defects:**  
_Report honestly. Screenshots of critical path attached separately._
