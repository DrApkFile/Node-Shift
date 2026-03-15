use anchor_lang::prelude::*;

declare_id!("txyHnTyAi8MiVFy3ZLQeqJiCHKt3FuJx2gg2pvab8T9");

#[program]
pub mod anchor_rbac {
    use super::*;

    // ============================================================
    // WEB2 DEVELOPER OVERVIEW
    // ============================================================
    // Web2 RBAC typically uses middleware: `checkRole('ADMIN')` in Express,
    // or `@Roles(Role.Admin)` decorators in NestJS.
    // On Solana, role checks move into the `#[derive(Accounts)]` struct via `constraint =`.
    // Unauthorized calls are rejected BEFORE the instruction body even runs.
    //
    // All 4 instructions below are [CORE PATTERN LOGIC].
    //
    // Key Web2 Concepts Mapped:
    //   - `users.roles` DB table entry              → `UserProfile` PDA (per-wallet account)
    //   - `checkRole('ADMIN')` middleware            → `constraint = user_profile.role == UserRole::Admin`
    //   - Hierarchical role check (Admin || Editor) → constraint with `||` in `EditorOnly` struct
    //   - `403 Forbidden`                            → `RbacError::Unauthorized` returned by Anchor
    //   - DELETE user role                           → `close_profile` (closes the PDA)
    // ============================================================

    /// [CORE PATTERN LOGIC]
    /// Closes the user's role PDA and returns rent to their wallet.
    /// Web2 equivalent: `DELETE /users/{id}/roles` — removing a user from the system.
    pub fn close_profile(_ctx: Context<CloseProfile>) -> Result<()> {
        msg!("User profile closed. SOL returned to authority.");
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// Creates a per-wallet UserProfile PDA storing an enum role (Viewer/Editor/Admin).
    /// Web2 equivalent: `POST /users/{id}/roles` — assigning a role to a user record in the DB.
    /// Note: The PDA seeds include the authority's pubkey, so each wallet has exactly one profile.
    pub fn initialize_user_role(ctx: Context<InitializeUser>, role: u8) -> Result<()> {
        let profile = &mut ctx.accounts.user_profile;
        profile.owner = ctx.accounts.authority.key();
        profile.role = match role {
            0 => UserRole::Viewer,
            1 => UserRole::Editor,
            2 => UserRole::Admin,
            _ => return err!(RbacError::InvalidRole),
        };
        msg!("User profile initialized with role: {:?}", profile.role);
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// A gated instruction that only Admins can call.
    /// The role check lives in `AdminOnly::user_profile` constraint, not here.
    /// Web2 equivalent: An Express route with `checkRole('ADMIN')` middleware.
    pub fn admin_only_instruction(_ctx: Context<AdminOnly>) -> Result<()> {
        msg!("Access Granted: Admin only instruction executed.");
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// A gated instruction accessible by Editor OR Admin (hierarchical check).
    /// Web2 equivalent: `@Roles(Role.Editor, Role.Admin)` in NestJS or `checkRole(['editor','admin'])`.
    pub fn editor_instruction(_ctx: Context<EditorOnly>) -> Result<()> {
        msg!("Access Granted: Editor or Admin instruction executed.");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(
        init, 
        payer = authority, 
        space = 8 + 32 + 1,
        seeds = [b"user-profile", authority.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    // WEB2 NOTE: This constraint is like your 'checkRole(ADMIN)' middleware.
    #[account(
        seeds = [b"user-profile", authority.key().as_ref()],
        bump,
        constraint = user_profile.role == UserRole::Admin @ RbacError::Unauthorized
    )]
    pub user_profile: Account<'info, UserProfile>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct EditorOnly<'info> {
    // WEB2 NOTE: Hierarchical check: Admin or Editor can access.
    #[account(
        seeds = [b"user-profile", authority.key().as_ref()],
        bump,
        constraint = (user_profile.role == UserRole::Admin || user_profile.role == UserRole::Editor) @ RbacError::Unauthorized
    )]
    pub user_profile: Account<'info, UserProfile>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseProfile<'info> {
    #[account(
        mut,
        seeds = [b"user-profile", authority.key().as_ref()],
        bump,
        close = authority
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
pub struct UserProfile {
    pub owner: Pubkey,
    pub role: UserRole,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum UserRole {
    Viewer,
    Editor,
    Admin,
}

#[error_code]
pub enum RbacError {
    #[msg("You do not have the required permissions to perform this action.")]
    Unauthorized,
    #[msg("The provided role ID is invalid.")]
    InvalidRole,
}
