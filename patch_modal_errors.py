path = "/Users/yukeshmaharjan/Documents/SquadFronted/src/components/modals/SenderIdTranslationModal.tsx"
with open(path, "r") as f:
    content = f.read()

import_old = """import {
  SenderIdTranslationPolicy,
  SenderIdTranslationRule,
  getSenderTranslationPolicyApi,
  updateSenderTranslationPolicyApi,
  getSenderTranslationRulesApi,
  createSenderTranslationRuleApi,
  deleteSenderTranslationRuleApi,
  testSenderTranslationApi,
  TestTranslationResponse
} from "../../api/authorizationApi/senderIdTranslationApi";"""

import_new = """import type {
  SenderIdTranslationPolicy,
  SenderIdTranslationRule,
  TestTranslationResponse
} from "../../api/authorizationApi/senderIdTranslationApi";
import {
  getSenderTranslationPolicyApi,
  updateSenderTranslationPolicyApi,
  getSenderTranslationRulesApi,
  createSenderTranslationRuleApi,
  deleteSenderTranslationRuleApi,
  testSenderTranslationApi,
} from "../../api/authorizationApi/senderIdTranslationApi";"""

content = content.replace(import_old, import_new)

input_1_old = """                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Source Sender ID (Exact Match)</label>
                        <Input
                          value={newRule.sourceSenderId || ""}
                          onChange={(e) => setNewRule({...newRule, sourceSenderId: e.target.value})}
                        />"""
input_1_new = """                        <Input
                          label="Source Sender ID (Exact Match)"
                          value={newRule.sourceSenderId || ""}
                          onChange={(e) => setNewRule({...newRule, sourceSenderId: e.target.value})}
                        />"""
content = content.replace(input_1_old, input_1_new)

input_2_old = """                          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Replacement Value</label>
                          <Input
                            value={newRule.replacementSenderId || ""}
                            onChange={(e) => setNewRule({...newRule, replacementSenderId: e.target.value})}
                          />"""
input_2_new = """                          <Input
                            label="Replacement Value"
                            value={newRule.replacementSenderId || ""}
                            onChange={(e) => setNewRule({...newRule, replacementSenderId: e.target.value})}
                          />"""
content = content.replace(input_2_old, input_2_new)

input_3_old = """                          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Truncate Length</label>
                          <Input
                            type="number"
                            value={newRule.truncateLength || ""}
                            onChange={(e) => setNewRule({...newRule, truncateLength: Number(e.target.value)})}
                            placeholder="e.g. 11"
                          />"""
input_3_new = """                          <Input
                            label="Truncate Length"
                            type="number"
                            value={newRule.truncateLength || ""}
                            onChange={(e) => setNewRule({...newRule, truncateLength: Number(e.target.value)})}
                            placeholder="e.g. 11"
                          />"""
content = content.replace(input_3_old, input_3_new)

input_4_old = """                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Source Sender ID</label>
                    <Input value={testSource} onChange={e => setTestSource(e.target.value)} placeholder="Enter sender ID to test" required />"""
input_4_new = """                    <Input label="Source Sender ID" value={testSource} onChange={e => setTestSource(e.target.value)} placeholder="Enter sender ID to test" required />"""
content = content.replace(input_4_old, input_4_new)

input_5_old = """                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Destination Number</label>
                    <Input value={testDest} onChange={e => setTestDest(e.target.value)} placeholder="Enter MSISDN" required />"""
input_5_new = """                    <Input label="Destination Number" value={testDest} onChange={e => setTestDest(e.target.value)} placeholder="Enter MSISDN" required />"""
content = content.replace(input_5_old, input_5_new)

datatable_old = """                <DataTable
                  columns={[
                    { header: "Country", accessor: (r) => r.country ? countries.find(c => c.id === r.country)?.name || r.country : "Global" },
                    { header: "Original", accessor: "sourceSenderId" },
                    { header: "Action", accessor: "action" },
                    { header: "Output Param", accessor: (r) => r.action === "FIXED_REPLACE" ? r.replacementSenderId : r.action === "TRUNCATE" ? `Max len: ${r.truncateLength}` : "Empty" },
                    { 
                      header: "Actions", 
                      accessor: (r) => (
                        <button onClick={() => handleDeleteRule(r.id!)} className="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
                      )
                    }
                  ]}
                  data={rules}
                  keyExtractor={(r) => r.id!.toString()}
                />"""
datatable_new = """                <DataTable
                  data={rules}
                  headers={["Country", "Original", "Action", "Output Param", "Actions"]}
                  renderRow={(rule: SenderIdTranslationRule) => (
                    <tr key={rule.id} className="border-b dark:border-gray-700 text-sm">
                      <td className="p-3">{rule.country ? countries.find(c => c.id === rule.country)?.name || rule.country : "Global"}</td>
                      <td className="p-3">{rule.sourceSenderId}</td>
                      <td className="p-3">{rule.action}</td>
                      <td className="p-3">{rule.action === "FIXED_REPLACE" ? rule.replacementSenderId : rule.action === "TRUNCATE" ? `Max len: ${rule.truncateLength}` : "Empty"}</td>
                      <td className="p-3">
                        <button onClick={() => handleDeleteRule(rule.id!)} className="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
                      </td>
                    </tr>
                  )}
                />"""
content = content.replace(datatable_old, datatable_new)

with open(path, "w") as f:
    f.write(content)
print("Patched Modal Errors")
