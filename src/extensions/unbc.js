// UNBC's extension: profile pictures from the UNBC logo package, and door signs from the door-sign
// package (vendor/door-sign), whose editor is the one the UNBCDoor app uses.

export { profilePictures } from './unbc-logo.js'

export const view = {
  label: 'Door signs',
  use: 'UNBC door signs for faculty, staff, students, labs and rooms: the door-sign package’s editor, the same one the UNBCDoor app uses. It opens on the department chosen in Departments. Signs, custom card holders and print settings stay in this browser.',
  load: () => import('./DoorSigns.jsx')
}
