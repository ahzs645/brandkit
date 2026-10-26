// The door-sign package's editor as a brandkit view. Its styles are scoped to .door-sign-app,
// so they reach only the editor; it opens on the department saved in Departments.

import { DoorSignEditor, departmentSelection, departmentTypes, useDoorSign } from '../../vendor/door-sign/src/index.js'
import '../../vendor/door-sign/src/styles/door-sign.css'
import { readAffiliation } from '../app/affiliation.js'

const DoorSigns = ({ brand }) => {
  const department = readAffiliation(brand.id).department
  const sign = useDoorSign({ initialSignData: department ? departmentSelection(departmentTypes, department) : {} })
  return <div className="door-sign-app door-signs">
    <DoorSignEditor sign={sign} as="div" />
  </div>
}

export default DoorSigns
