# Comprehensive Test Matrix - Ranch Management System

## Test Environment Setup

### Prerequisites
1. Admin account with super admin privileges
2. At least 2 test user accounts (for invitation/role testing)
3. Sample CSV file with animal data
4. Sample animal photos
5. Multiple browser sessions for concurrent testing

---

## 1. LICENSE MANAGEMENT (Admin Only)

### 1.1 Generate License Keys
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| LM-1.1 | Generate single license key | Navigate to License Management > Generate Key, create key for 50 animals | Key generated successfully, displays in list |
| LM-1.2 | Generate multiple keys | Generate keys for 10, 50, 100, 250, 500 animals | All keys created with correct animal limits |
| LM-1.3 | View active keys | Check license keys list | All generated keys visible with status |
| LM-1.4 | Verify key format | Generate key and inspect | Key follows expected format and is unique |

### 1.2 Ranch Creation Invitations
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| LM-2.1 | Create ranch invitation | License Management > Ranch Creation Invitations, create invitation | Invitation code generated |
| LM-2.2 | View invitation link | Copy invitation link | Link properly formatted with invitation code |
| LM-2.3 | Redeem invitation (new user) | Open link in incognito, sign up with new account | Ranch created, user assigned as owner |
| LM-2.4 | Redeem invitation (existing user) | Open link while logged in | Ranch created and added to user's ranches |
| LM-2.5 | Invalid invitation | Try to redeem expired/used invitation | Appropriate error message |
| LM-2.6 | Associate license with invitation | Create invitation with specific license key | Ranch receives correct animal limit |

### 1.3 Backup Ranches
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| LM-3.1 | Backup single ranch | Select ranch, click backup | Backup file downloaded (JSON) |
| LM-3.2 | Backup multiple ranches | Select 2+ ranches, backup | All ranches included in backup |
| LM-3.3 | Backup ranch with photos | Backup ranch with animal photos | Photos included in backup package |
| LM-3.4 | Backup ranch with custom fields | Backup ranch with custom fields populated | Custom field definitions and values included |
| LM-3.5 | Backup empty ranch | Backup ranch with no animals | Backup successful with empty animal list |
| LM-3.6 | Verify backup contents | Open backup JSON, inspect structure | All data present: animals, medical history, injections, photos, settings, custom fields |

### 1.4 Restore Ranch
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| LM-4.1 | Restore ranch to new ranch | Upload backup, restore to new ranch name | New ranch created with all data |
| LM-4.2 | Restore ranch to existing ranch | Upload backup, restore to existing ranch | Data replaced/merged appropriately |
| LM-4.3 | Restore with photos | Restore backup containing photos | Photos restored and viewable |
| LM-4.4 | Restore with custom fields | Restore backup with custom fields | Custom fields recreated with values |
| LM-4.5 | Restore validation | Attempt to restore corrupted backup | Appropriate error message |
| LM-4.6 | Restore with medical history | Restore backup with medical records | Medical history restored correctly |
| LM-4.7 | Restore with injections | Restore backup with injection records | Injections restored correctly |

### 1.5 System Report
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| LM-5.1 | Generate system report | License Management > System Report | Report generated with all system statistics |
| LM-5.2 | Verify ranch count | Check report against actual ranches | Count matches |
| LM-5.3 | Verify user count | Check report against actual users | Count matches |
| LM-5.4 | Verify animal count | Check report against actual animals | Count matches |
| LM-5.5 | Verify license usage | Check active licenses vs available | Numbers accurate |

### 1.6 Broadcast Messages
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| LM-6.1 | Send broadcast to all users | Compose message, send to all | All users receive message |
| LM-6.2 | Send broadcast to specific ranch | Select ranch, send message | Only ranch members receive message |
| LM-6.3 | Verify message delivery | Check recipient accounts | Message appears in License/Help |

---

## 2. USER INVITATIONS & RANCH ACCESS

### 2.1 Invite Users to Ranch
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| UI-1.1 | Invite user as Manager | Create invitation with Manager role | Invitation created with code |
| UI-1.2 | Invite user as Viewer | Create invitation with Viewer role | Invitation created with code |
| UI-1.3 | Redeem invitation (new user) | New user signs up and redeems | User added to ranch with correct role |
| UI-1.4 | Redeem invitation (existing user) | Existing user redeems invitation | User added to ranch, sees new ranch |
| UI-1.5 | View pending invitations | Check invitations list | All unredeemed invitations visible |
| UI-1.6 | Cancel invitation | Delete pending invitation | Invitation no longer redeemable |

### 2.2 Ranch Switching
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| RS-1.1 | Switch between ranches | User with 2+ ranches changes active ranch | Data updates to show new ranch |
| RS-1.2 | Verify data isolation | View animals in Ranch A, switch to Ranch B | Only Ranch B animals visible |
| RS-1.3 | Settings per ranch | Change settings in Ranch A, switch to Ranch B | Each ranch maintains separate settings |

---

## 3. ANIMAL MANAGEMENT

### 3.1 Add Animals
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| AM-1.1 | Add cattle (basic info) | Fill required fields, save | Animal created successfully |
| AM-1.2 | Add horse | Change animal type to Horse, fill fields | Horse created with horse-specific fields |
| AM-1.3 | Add sheep | Change animal type to Sheep, fill fields | Sheep created |
| AM-1.4 | Add goat | Change animal type to Goat, fill fields | Goat created |
| AM-1.5 | Add pig | Change animal type to Pig, fill fields | Pig created |
| AM-1.6 | Add "Other" type | Change animal type to Other, fill fields | Other animal created |
| AM-1.7 | Add with all optional fields | Fill all available fields | All data saved correctly |
| AM-1.8 | Add with photo | Upload photo during creation | Animal created with photo |
| AM-1.9 | Add with custom fields | Populate custom field values | Custom data saved |
| AM-1.10 | Validate required fields | Try to save without required fields | Validation errors shown |
| AM-1.11 | Test license limit | Add animals up to license limit | Addition allowed until limit reached |
| AM-1.12 | Exceed license limit | Try to add animal over limit | Error message, creation blocked |

### 3.2 Edit Animals
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| AM-2.1 | Edit basic info | Change tag, description, etc. | Changes saved |
| AM-2.2 | Change animal type | Switch from Cattle to Horse | Type changed, fields adjusted |
| AM-2.3 | Edit custom field values | Modify custom field data | Changes saved |
| AM-2.4 | Add photo to existing animal | Upload photo for animal without photo | Photo added |
| AM-2.5 | Edit sale price | Add/modify sale price | Sale price updated |
| AM-2.6 | Edit dates | Change birth date, purchase date | Dates updated, age recalculated |

### 3.3 Delete Animals
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| AM-3.1 | Delete single animal | Select animal, delete | Animal removed from list |
| AM-3.2 | Delete animal with photos | Delete animal that has photos | Animal and photos removed |
| AM-3.3 | Delete animal with medical history | Delete animal with medical records | Animal and history removed |
| AM-3.4 | Delete animal with injections | Delete animal with injection records | Animal and injections removed |
| AM-3.5 | Verify deletion in backup | Delete animal, create backup | Deleted animal not in backup |

### 3.4 Animal Detail View
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| AM-4.1 | View animal detail modal | Click on animal | Modal opens with all info |
| AM-4.2 | View photo gallery | Open animal with multiple photos | All photos displayed in gallery |
| AM-4.3 | View medical history | Check medical history section | All records displayed |
| AM-4.4 | View injection history | Check injection section | All injections displayed |
| AM-4.5 | View custom fields | Check custom fields section | All custom data displayed |
| AM-4.6 | Navigate between animals | Use next/previous buttons | Navigation works correctly |

---

## 4. PHOTO MANAGEMENT

### 4.1 Photo Upload
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| PM-1.1 | Upload single photo | Select animal, upload image | Photo uploaded and displayed |
| PM-1.2 | Upload multiple photos | Upload 3+ photos to same animal | All photos uploaded |
| PM-1.3 | Upload from camera | Use camera capture feature | Photo captured and uploaded |
| PM-1.4 | Upload large image | Upload high-resolution image | Image uploaded (check size limits) |
| PM-1.5 | Upload invalid file | Try to upload non-image file | Error message shown |
| PM-1.6 | Upload with storage limit | Test storage quota enforcement | Appropriate handling |

### 4.2 Photo Viewing
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| PM-2.1 | View photo gallery | Open animal with photos | Gallery displays all photos |
| PM-2.2 | Enlarge photo | Click on thumbnail | Full-size photo displayed |
| PM-2.3 | Navigate photos | Use gallery navigation | Can move between photos |

### 4.3 Photo Deletion
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| PM-3.1 | Delete single photo | Select photo, delete | Photo removed |
| PM-3.2 | Delete all photos | Delete all photos from animal | All photos removed |

### 4.4 Image Import
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| PM-4.1 | Import images by tag | Upload images with tags in filename | Images matched to animals |
| PM-4.2 | Import with unmatched tags | Upload image with non-existent tag | Appropriate warning/handling |
| PM-4.3 | Import multiple images | Upload batch of images | All valid images imported |

---

## 5. MEDICAL HISTORY

### 5.1 Add Medical Records
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| MH-1.1 | Add medical record | Open animal, add medical history entry | Record saved |
| MH-1.2 | Add with all fields | Fill date, description, notes | All data saved |
| MH-1.3 | Add multiple records | Add 3+ medical records | All records saved |

### 5.2 View Medical Records
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| MH-2.1 | View medical history | Open animal detail, check history | All records displayed chronologically |
| MH-2.2 | View empty history | Check animal with no history | Appropriate empty state |

### 5.3 Edit/Delete Medical Records
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| MH-3.1 | Edit medical record | Modify existing record | Changes saved |
| MH-3.2 | Delete medical record | Remove record | Record deleted |

---

## 6. INJECTION FEATURE

### 6.1 Enable/Disable Feature
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| IN-1.1 | Enable injection feature | Settings > Enable injection feature | Feature enabled, UI appears |
| IN-1.2 | Disable injection feature | Settings > Disable injection feature | Feature hidden |
| IN-1.3 | View disclaimer on enable | First time enabling feature | Disclaimer modal shown |

### 6.2 Add Injections
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| IN-2.1 | Add injection record | Open animal, add injection | Injection saved |
| IN-2.2 | Select drug from list | Use drug dropdown | Drug selected |
| IN-2.3 | Add custom drug | Enter custom drug name | Custom drug saved |
| IN-2.4 | Add with all fields | Fill date, drug, dosage, notes | All data saved |
| IN-2.5 | Add multiple injections | Add 3+ injection records | All records saved |

### 6.3 View Injections
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| IN-3.1 | View injection history | Open animal detail | All injections displayed |
| IN-3.2 | View empty history | Check animal with no injections | Appropriate empty state |

### 6.4 Edit/Delete Injections
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| IN-4.1 | Edit injection record | Modify existing record | Changes saved |
| IN-4.2 | Delete injection record | Remove record | Record deleted |

---

## 7. CUSTOM FIELDS

### 7.1 Create Custom Fields
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CF-1.1 | Create text custom field | Settings > Add custom field (text type) | Field created |
| CF-1.2 | Create number custom field | Add custom field (number type) | Field created |
| CF-1.3 | Create date custom field | Add custom field (date type) | Field created |
| CF-1.4 | Create multiple custom fields | Add 3+ custom fields | All fields created |
| CF-1.5 | Validate field name uniqueness | Try to create duplicate field name | Error shown |

### 7.2 Use Custom Fields
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CF-2.1 | Populate custom field (add) | Add animal, fill custom field | Data saved |
| CF-2.2 | Populate custom field (edit) | Edit animal, modify custom field | Changes saved |
| CF-2.3 | View custom field in detail | Open animal detail | Custom field data displayed |
| CF-2.4 | Leave custom field empty | Save animal without filling custom field | Allowed, no error |

### 7.3 Delete Custom Fields
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CF-3.1 | Delete custom field | Settings > Delete custom field | Field removed |
| CF-3.2 | Verify data after deletion | Check animals that had data in deleted field | Field no longer visible |

### 7.4 Custom Fields in Backup/Restore
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CF-4.1 | Backup with custom fields | Create backup of ranch with custom fields | Fields included in backup |
| CF-4.2 | Restore with custom fields | Restore backup with custom fields | Fields and data restored |
| CF-4.3 | Restore to ranch with different fields | Restore backup with custom field A to ranch with custom field B | Appropriate handling/merging |

---

## 8. IMPORT FEATURES

### 8.1 Generic CSV Import
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CSV-1.1 | Import valid CSV | Upload CSV with correct format | Animals imported successfully |
| CSV-1.2 | Import with all fields | CSV includes all possible columns | All data imported |
| CSV-1.3 | Import with minimal fields | CSV with only required columns | Animals imported with defaults |
| CSV-1.4 | Import with invalid data | CSV with bad dates, numbers | Errors reported for invalid rows |
| CSV-1.5 | Import with duplicates | CSV with duplicate tags | Appropriate handling (skip/error) |
| CSV-1.6 | Import empty CSV | Upload CSV with headers only | No animals added, appropriate message |
| CSV-1.7 | Import with custom field columns | CSV includes custom field data | Custom fields populated |
| CSV-1.8 | Import different animal types | CSV with mixed animal types | All types imported correctly |
| CSV-1.9 | Preview before import | Review import preview | Shows correct data to be imported |
| CSV-1.10 | Cancel import | Start import, then cancel | No data imported |

---

## 9. BACKUP & RESTORE (User Level)

### 9.1 Export Complete Backup
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| BR-1.1 | Export ranch backup | Click Export Complete Backup | Backup file downloaded |
| BR-1.2 | Verify backup contents | Open downloaded file | Contains all ranch data |
| BR-1.3 | Backup includes photos | Verify photos in backup | Photos included/referenced |
| BR-1.4 | Backup includes custom fields | Verify custom fields in backup | Fields and values included |
| BR-1.5 | Backup includes settings | Verify ranch settings in backup | Settings included |
| BR-1.6 | Backup file format | Check file extension and format | Proper format (ZIP/JSON) |

### 9.2 Restore Complete Backup
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| BR-2.1 | Restore from backup | Upload backup, restore | All data restored |
| BR-2.2 | Restore overwrites current data | Create backup, modify data, restore | Data reverted to backup state |
| BR-2.3 | New animals after backup | Create backup, add animal, restore | New animal removed |
| BR-2.4 | Edited animals after backup | Create backup, edit animal, restore | Edits undone |
| BR-2.5 | Deleted animals after backup | Create backup, delete animal, restore | Animal restored |
| BR-2.6 | Custom fields restored | Backup with custom fields, modify, restore | Custom fields restored correctly |
| BR-2.7 | Photos restored | Backup with photos, delete photos, restore | Photos restored |
| BR-2.8 | Settings restored | Backup, change settings, restore | Settings reverted |
| BR-2.9 | Medical history restored | Backup, modify medical records, restore | History restored |
| BR-2.10 | Injections restored | Backup, modify injections, restore | Injections restored |

---

## 10. REPORTS

### 10.1 Report Generation
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| RP-1.1 | Generate Complete Herd Report | Select report type, generate | Report displays all animals |
| RP-1.2 | Generate Breeding Report | Generate breeding report | Shows breeding-eligible animals |
| RP-1.3 | Generate Sales Report | Generate sales report | Shows animals with sale prices |
| RP-1.4 | Generate Age-based Reports | Generate adult/youth reports | Correct animals based on age threshold |
| RP-1.5 | Generate Custom Field Report | Generate report with custom fields | Custom field data included |
| RP-1.6 | Generate report with filters | Apply filters, generate report | Only filtered animals shown |
| RP-1.7 | Generate report by animal type | Filter by type, generate report | Only selected type shown |
| RP-1.8 | Generate empty report | Generate report with no matching animals | Shows empty state |

### 10.2 Report Printing
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| RP-2.1 | Print report (browser) | Click Print, use browser print | Print dialog opens correctly |
| RP-2.2 | Print report (PDF) | Print to PDF | PDF generated properly |
| RP-2.3 | Print with photos | Print report including photos | Photos appear in print |
| RP-2.4 | Print multi-page report | Print large dataset | Pagination correct |
| RP-2.5 | Print landscape vs portrait | Test both orientations | Formatting correct |
| RP-2.6 | Print with custom header | Set report header in settings, print | Custom header appears |

### 10.3 Report Data Accuracy
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| RP-3.1 | Verify animal count | Compare report count to actual | Numbers match |
| RP-3.2 | Verify age calculations | Check ages in report | Ages calculated correctly |
| RP-3.3 | Verify adult/youth classification | Check age threshold application | Classification correct |
| RP-3.4 | Verify sale price totals | Check totals on sales report | Math correct |
| RP-3.5 | Verify prorate calculations | Check prorated values | Calculations correct |
| RP-3.6 | Verify date formatting | Check date display in reports | Dates formatted correctly |

---

## 11. SEARCH

### 11.1 Animal Search
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SR-1.1 | Search by tag | Enter tag number | Matching animals shown |
| SR-1.2 | Search by description | Enter description keyword | Matching animals shown |
| SR-1.3 | Search by custom field | Search custom field value | Matching animals shown |
| SR-1.4 | Search partial match | Enter partial tag/description | Partial matches shown |
| SR-1.5 | Search no results | Search for non-existent data | "No results" message |
| SR-1.6 | Search case insensitive | Search with different case | Results returned regardless of case |
| SR-1.7 | Clear search | Clear search field | All animals shown again |
| SR-1.8 | Search with filters | Combine search with animal type filter | Both filters applied |

---

## 12. SETTINGS

### 12.1 Ranch Settings
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| ST-1.1 | Change ranch name | Edit ranch name, save | Name updated |
| ST-1.2 | Change time zone | Select different time zone | Time zone updated |
| ST-1.3 | Set report header line 1 | Enter custom text | Header saved |
| ST-1.4 | Set report header line 2 | Enter custom text | Header saved |
| ST-1.5 | Verify headers in reports | Generate report after setting headers | Headers appear correctly |
| ST-1.6 | Change default animal type | Select different default | New animals default to selected type |
| ST-1.7 | Set adult age threshold (cattle) | Change cattle adult age | Affects cattle age classification |
| ST-1.8 | Set adult age threshold (horses) | Change horse adult age | Affects horse age classification |
| ST-1.9 | Set adult age threshold (sheep) | Change sheep adult age | Affects sheep age classification |
| ST-1.10 | Set adult age threshold (goats) | Change goat adult age | Affects goat age classification |
| ST-1.11 | Set adult age threshold (pigs) | Change pig adult age | Affects pig age classification |
| ST-1.12 | Change print program | Select different print program option | Setting saved |
| ST-1.13 | Add ranch contact info | Enter address, phone, email | Contact info saved |
| ST-1.14 | Update ranch contact info | Modify existing contact info | Changes saved |

### 12.2 Danger Zone
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| ST-2.1 | Delete all data | Settings > Danger Zone > Delete All Data | Confirmation required |
| ST-2.2 | Confirm deletion | Confirm delete all data | All animals, photos, records deleted |
| ST-2.3 | Verify deletion | Check Animals page | All data removed |
| ST-2.4 | Settings after deletion | Check if settings retained | Settings retained or reset appropriately |
| ST-2.5 | Cancel deletion | Start delete, cancel confirmation | No data deleted |

---

## 13. LICENSING & HELP

### 13.1 License Status
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| LH-1.1 | View license status | Check License/Help page | Shows active license and limits |
| LH-1.2 | View animal count | Check current animal count | Accurate count shown |
| LH-1.3 | View limit approaching warning | Add animals near limit | Warning banner appears |
| LH-1.4 | View limit exceeded | At limit, try to add animal | Cannot add, error shown |
| LH-1.5 | Activate license key | Enter valid license key | License activated, limit increased |
| LH-1.6 | Invalid license key | Enter invalid key | Error message shown |

### 13.2 Messages
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| LH-2.1 | Send message to admin | Compose and send message | Message sent successfully |
| LH-2.2 | Receive message from admin | Admin sends broadcast | Message appears in inbox |
| LH-2.3 | View message list | Check messages | All messages displayed |
| LH-2.4 | Read message | Click on message | Message content displayed |

---

## 14. USER ROLES & PERMISSIONS

### 14.1 Owner Role
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| UR-1.1 | Owner can add animals | Login as owner, add animal | Success |
| UR-1.2 | Owner can edit animals | Edit animal | Success |
| UR-1.3 | Owner can delete animals | Delete animal | Success |
| UR-1.4 | Owner can modify settings | Change ranch settings | Success |
| UR-1.5 | Owner can invite users | Create invitation | Success |
| UR-1.6 | Owner can backup/restore | Export and restore backup | Success |

### 14.2 Manager Role
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| UR-2.1 | Manager can add animals | Login as manager, add animal | Success |
| UR-2.2 | Manager can edit animals | Edit animal | Success |
| UR-2.3 | Manager can delete animals | Delete animal | Success |
| UR-2.4 | Manager can modify settings | Try to change ranch settings | Check if allowed |
| UR-2.5 | Manager can invite users | Try to create invitation | Check if allowed |
| UR-2.6 | Manager can backup/restore | Try to backup/restore | Check if allowed |

### 14.3 Viewer Role
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| UR-3.1 | Viewer cannot add animals | Login as viewer, try to add | Button hidden or disabled |
| UR-3.2 | Viewer cannot edit animals | Try to edit animal | Button hidden or disabled |
| UR-3.3 | Viewer cannot delete animals | Try to delete animal | Button hidden or disabled |
| UR-3.4 | Viewer can view animals | View animal list and details | Success |
| UR-3.5 | Viewer can generate reports | Generate report | Success |
| UR-3.6 | Viewer can search | Search for animals | Success |

---

## 15. TIPS & TRICKS (Admin)

### 15.1 Manage Tips
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| TT-1.1 | View tips list | Navigate to Tips management | All tips displayed |
| TT-1.2 | Add new tip | Create new tip/trick | Tip saved |
| TT-1.3 | Edit tip | Modify existing tip | Changes saved |
| TT-1.4 | Delete tip | Remove tip | Tip deleted |
| TT-1.5 | View tips as user | Login as regular user | Tips displayed in modal |

---

## 16. EDGE CASES & ERROR HANDLING

### 16.1 Data Validation
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| EC-1.1 | Invalid date format | Enter malformed date | Error message shown |
| EC-1.2 | Future birth date | Enter birth date in future | Validation error |
| EC-1.3 | Negative numbers | Enter negative age, weight, price | Validation error or converted to positive |
| EC-1.4 | Special characters in tags | Enter tag with special characters | Handled appropriately |
| EC-1.5 | Very long text fields | Enter excessive text | Truncated or error |
| EC-1.6 | SQL injection attempt | Enter SQL in text fields | Sanitized, no injection |
| EC-1.7 | XSS attempt | Enter script tags in text | Sanitized, no execution |

### 16.2 Performance
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| EC-2.1 | Large dataset (500 animals) | Add 500 animals, test performance | Acceptable load times |
| EC-2.2 | Large dataset (1000 animals) | Add 1000 animals, test performance | Acceptable load times |
| EC-2.3 | Many photos (50 per animal) | Upload many photos to one animal | Performance acceptable |
| EC-2.4 | Large CSV import | Import CSV with 500+ rows | Import completes successfully |
| EC-2.5 | Large backup file | Backup ranch with 1000 animals | Backup completes |
| EC-2.6 | Search performance | Search in large dataset | Results returned quickly |

### 16.3 Concurrent Users
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| EC-3.1 | Simultaneous edits | Two users edit same animal | Last save wins or conflict handled |
| EC-3.2 | Simultaneous deletions | Two users try to delete same animal | Handled gracefully |
| EC-3.3 | Race condition on limit | Two users add animal at limit simultaneously | Only one succeeds |

### 16.4 Network & Storage
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| EC-4.1 | Offline mode | Disconnect network, try to save | Appropriate error message |
| EC-4.2 | Slow connection | Test on slow network | Loading states shown |
| EC-4.3 | Storage quota | Test storage limits for photos | Appropriate handling |
| EC-4.4 | Session timeout | Leave app idle, try to act | Session handling appropriate |

---

## 17. SALE PRICE & PRORATE

### 17.1 Sale Price Management
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SP-1.1 | Add sale price | Enter sale price for animal | Price saved |
| SP-1.2 | Edit sale price | Modify existing sale price | Changes saved |
| SP-1.3 | Remove sale price | Clear sale price field | Price removed |
| SP-1.4 | View sales report | Generate sales report | Animals with prices shown |
| SP-1.5 | Calculate sale totals | Check sales report totals | Math correct |

### 17.2 Prorate Calculations
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SP-2.1 | Open prorate modal | Click prorate calculation | Modal opens |
| SP-2.2 | Calculate prorate value | Enter dates and amount | Calculation correct |
| SP-2.3 | Verify prorate formula | Test with known values | Formula accurate |

---

## 18. AUTHENTICATION & SECURITY

### 18.1 Sign Up
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| AU-1.1 | Sign up with valid email | Create new account | Account created, confirmation shown |
| AU-1.2 | Sign up with duplicate email | Use existing email | Error message |
| AU-1.3 | Sign up with invalid email | Use malformed email | Validation error |
| AU-1.4 | Sign up with weak password | Use short/weak password | Validation error |
| AU-1.5 | Auto-create ranch on signup | Complete signup | Ranch automatically created |

### 18.2 Login
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| AU-2.1 | Login with valid credentials | Enter correct email/password | Login successful |
| AU-2.2 | Login with invalid password | Enter wrong password | Error message |
| AU-2.3 | Login with non-existent email | Enter unregistered email | Error message |
| AU-2.4 | Logout | Click logout | Logged out, redirected to login |
| AU-2.5 | Session persistence | Login, close browser, reopen | Still logged in |

### 18.3 Password Reset
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| AU-3.1 | Request password reset | Enter email, request reset | Reset email sent |
| AU-3.2 | Reset password with valid token | Use reset link, set new password | Password changed |
| AU-3.3 | Reset with expired token | Use old reset link | Error message |

---

## 19. DEMO MODE

### 19.1 Demo Ranch
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| DM-1.1 | Welcome modal on first login | New user logs in | Welcome modal shown |
| DM-1.2 | Demo data pre-populated | Check animals in new ranch | Sample animals exist |
| DM-1.3 | Dismiss welcome modal | Close modal | Modal doesn't reappear |

---

## 20. INTEGRATION TESTS

### 20.1 Complete Workflow Tests
| Test ID | Scenario | Expected Outcome |
|---------|----------|------------------|
| IT-1.1 | New user complete workflow | Sign up → Create ranch → Add animals → Generate report → Export backup |
| IT-2.1 | Multi-ranch workflow | Create 2 ranches → Switch between → Verify data isolation |
| IT-3.1 | Invitation workflow | Owner invites manager → Manager redeems → Manager adds animals → Owner sees changes |
| IT-4.1 | Backup/restore workflow | Add 10 animals → Backup → Delete 5 → Add 3 new → Restore → Verify original 10 restored |
| IT-5.1 | License enforcement | Reach limit → Cannot add → Activate new license → Can add again |

---

## TEST EXECUTION TRACKING

### Test Summary Template

| Category | Total Tests | Passed | Failed | Blocked | Not Run |
|----------|-------------|--------|--------|---------|---------|
| License Management | | | | | |
| User Invitations | | | | | |
| Animal Management | | | | | |
| Photo Management | | | | | |
| Medical History | | | | | |
| Injection Feature | | | | | |
| Custom Fields | | | | | |
| Import Features | | | | | |
| Backup & Restore | | | | | |
| Reports | | | | | |
| Search | | | | | |
| Settings | | | | | |
| Licensing & Help | | | | | |
| User Roles | | | | | |
| Tips & Tricks | | | | | |
| Edge Cases | | | | | |
| Sale Price/Prorate | | | | | |
| Authentication | | | | | |
| Demo Mode | | | | | |
| Integration Tests | | | | | |

### Bug Report Template

```
Bug ID: [ID]
Test ID: [Related Test ID]
Severity: [Critical/High/Medium/Low]
Priority: [High/Medium/Low]
Title: [Short description]
Steps to Reproduce:
1.
2.
3.
Expected Result:
Actual Result:
Screenshots: [If applicable]
Environment: [Browser, OS, etc.]
Notes:
```

---

## TEST ENVIRONMENT REQUIREMENTS

### Test Accounts Needed
1. Super Admin account
2. Owner account (Ranch A)
3. Owner account (Ranch B)
4. Manager account
5. Viewer account
6. Fresh test account (for new user flows)

### Test Data Needed
1. Sample CSV with 50+ animal records (various types)
2. Sample CSV with invalid data
3. 20+ sample animal photos
4. Sample large image file (for size testing)
5. Sample backup files

### Browser Coverage
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome (Android)

---

## TESTING NOTES

1. Test with different screen sizes (desktop, tablet, mobile)
2. Test keyboard navigation and accessibility
3. Test with browser dev tools network throttling
4. Clear browser cache between major test sequences
5. Document all deviations from expected behavior
6. Take screenshots of any UI issues
7. Note performance issues (slow loads, laggy UI)
8. Test with different data volumes (empty, small, large datasets)
9. Verify all error messages are clear and helpful
10. Check that all features work across different animal types
