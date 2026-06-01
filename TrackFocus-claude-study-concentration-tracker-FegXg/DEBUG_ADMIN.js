// ============================================
// DEBUG ADMIN LOGIN - Pega esto en la consola
// ============================================

(async () => {
  console.log('🔍 INICIANDO DIAGNÓSTICO DE ADMIN...\n');

  // 1. Verificar constantes
  console.log('1️⃣ SUPER_ADMIN_EMAILS en Auth:');
  try {
    const emails = Auth.getSuperAdminEmails?.();
    console.log('   ✅ Emails:', emails);
  } catch (e) {
    console.error('   ❌ Error:', e.message);
  }

  // 2. Verificar sesión Supabase
  console.log('\n2️⃣ Sesión Supabase:');
  try {
    const { data: { session } } = await window.SB.auth.getSession();
    if (session) {
      const email = session.user.email.toLowerCase();
      console.log('   ✅ Email logged in:', email);

      // 3. Verificar usuario en tabla users
      console.log('\n3️⃣ Usuario en tabla "users":');
      const usersRes = await window.SB.from('users').select('id, email, role').eq('id', email).single();
      if (usersRes.data) {
        console.log('   ✅ Found:', usersRes.data);
      } else {
        console.error('   ❌ NOT FOUND in users table');
        console.log('   Error:', usersRes.error);
      }

      // 4. Verificar roles disponibles
      console.log('\n4️⃣ Roles en tabla "user_roles":');
      const rolesRes = await window.SB.from('user_roles').select('*').eq('email', email);
      if (rolesRes.data) {
        console.log('   ✅ Found', rolesRes.data.length, 'role(s):', rolesRes.data);
      } else {
        console.error('   ❌ No roles found');
        console.log('   Error:', rolesRes.error);
      }

      // 5. Verificar qué retorna Auth.getSession()
      console.log('\n5️⃣ Auth.getSession() return:');
      const sess = await Auth.getSession();
      console.log('   isSuperAdmin:', sess?.isSuperAdmin);
      console.log('   availableRoles:', sess?.availableRoles);
      console.log('   user:', sess?.user?.email, sess?.user?.role);

    } else {
      console.error('   ❌ No session found');
    }
  } catch (e) {
    console.error('   ❌ Error:', e.message);
  }

  console.log('\n✅ DIAGNÓSTICO COMPLETO. Revisa arriba para problemas ⬆️');
})();
